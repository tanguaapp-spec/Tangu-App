-- =====================================================================
-- 0029 — Engajamento de verdade: pontos sem brecha, ranking e prêmios
-- =====================================================================
-- Só acrescenta. Pode rodar já e mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Laranjas sem brecha: cada ação rende uma vez só
-- ---------------------------------------------------------------------
-- referencia = o que gerou o ponto (o negócio favoritado, o vizinho
-- indicado…). Desfavoritar e favoritar de novo não soma outra vez.
alter table public.pontos_laranjas add column if not exists referencia text;
create unique index if not exists pontos_laranjas_uma_vez_idx
  on public.pontos_laranjas(perfil_id, motivo, referencia) where referencia is not null;
create index if not exists pontos_laranjas_criado_idx on public.pontos_laranjas(criado_em);

-- Indicação só vale quando o vizinho indicado CONFIRMA o e-mail (antes,
-- contava no cadastro e dava para inflar com contas falsas). Roda no banco,
-- então vale para qualquer forma de confirmação.
create or replace function public.creditar_indicacao_confirmada()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_padrinho uuid;
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  if coalesce(new.raw_user_meta_data->>'codigo_convite', '') = '' then return new; end if;

  select id into v_padrinho from public.perfis
   where codigo_convite = new.raw_user_meta_data->>'codigo_convite' and id <> new.id;
  if v_padrinho is null then return new; end if;

  insert into public.pontos_laranjas (perfil_id, quantidade, motivo, referencia)
  values (v_padrinho, 20, 'indicacao', new.id::text)
  on conflict do nothing;
  return new;
exception when others then
  -- nunca atrapalhar a confirmação do e-mail
  return new;
end;
$$;

do $$ begin
  drop trigger if exists auth_users_indicacao_confirmada on auth.users;
  create trigger auth_users_indicacao_confirmada
    after insert or update of email_confirmed_at on auth.users
    for each row execute function public.creditar_indicacao_confirmada();
end $$;

-- ---------------------------------------------------------------------
-- 2. Ranking de engajamento (Admin → Engajamento)
-- ---------------------------------------------------------------------
-- Uma linha por pessoa que fez algo no período. Só o servidor chama.
create or replace function public.ranking_engajamento(p_inicio timestamptz, p_fim timestamptz, p_limite int default 100)
returns table (
  perfil_id uuid,
  nome text,
  bairro text,
  laranjas bigint,
  indicacoes bigint,
  avaliacoes bigint,
  favoritos bigint,
  saldo_total bigint
)
language sql stable security definer set search_path = public
as $$
  with pts as (
    select l.perfil_id,
           sum(l.quantidade) as laranjas,
           count(*) filter (where l.motivo = 'indicacao') as indicacoes
      from public.pontos_laranjas l
     where l.criado_em >= p_inicio and l.criado_em < p_fim
     group by l.perfil_id
  ),
  aval as (
    select a.autor_id as perfil_id, count(*) as avaliacoes
      from public.avaliacoes a
     where a.criado_em >= p_inicio and a.criado_em < p_fim
     group by a.autor_id
  ),
  fav as (
    select f.perfil_id, count(*) as favoritos
      from public.favoritos f
     where f.criado_em >= p_inicio and f.criado_em < p_fim
     group by f.perfil_id
  ),
  gente as (
    select perfil_id from pts union select perfil_id from aval union select perfil_id from fav
  )
  select p.id, p.nome_completo, p.bairro,
         coalesce(pts.laranjas, 0), coalesce(pts.indicacoes, 0),
         coalesce(aval.avaliacoes, 0), coalesce(fav.favoritos, 0),
         coalesce((select sum(t.quantidade) from public.pontos_laranjas t where t.perfil_id = p.id), 0)
    from gente g
    join public.perfis p on p.id = g.perfil_id
    left join pts on pts.perfil_id = g.perfil_id
    left join aval on aval.perfil_id = g.perfil_id
    left join fav on fav.perfil_id = g.perfil_id
   where p.suspenso_em is null
   order by 4 desc, 6 desc, 5 desc, 7 desc, p.nome_completo
   limit greatest(1, least(coalesce(p_limite, 100), 1000))
$$;
revoke all on function public.ranking_engajamento(timestamptz, timestamptz, int) from public, anon, authenticated;
grant execute on function public.ranking_engajamento(timestamptz, timestamptz, int) to service_role;

-- Selos públicos ao lado do nome nas avaliações: só contagens, de quem já
-- avaliou (não expõe quais negócios a pessoa favoritou).
create or replace function public.contagens_selos(p_autores uuid[])
returns table (perfil_id uuid, avaliacoes bigint, favoritos bigint)
language sql stable security definer set search_path = public
as $$
  select u.id,
         (select count(*) from public.avaliacoes a where a.autor_id = u.id),
         (select count(*) from public.favoritos f where f.perfil_id = u.id)
    from unnest(p_autores[1:100]) as u(id)
$$;
revoke all on function public.contagens_selos(uuid[]) from public;
grant execute on function public.contagens_selos(uuid[]) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Prêmios dos parceiros e quem ganhou
-- ---------------------------------------------------------------------
create table if not exists public.premios (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null check (char_length(titulo) between 3 and 120),
  descricao text check (char_length(descricao) <= 600),
  -- quem oferece: um comércio do app (link pro perfil) ou só o nome do parceiro
  negocio_id uuid references public.negocios(id) on delete set null,
  parceiro text check (char_length(parceiro) <= 120),
  -- como ganhar, em palavras (ex.: "1º lugar do ranking de novembro")
  regra text check (char_length(regra) <= 200),
  quantidade int check (quantidade is null or quantidade > 0),
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.premios enable row level security;
revoke insert, update, delete on public.premios from anon, authenticated;
drop policy if exists "premios_select" on public.premios;
create policy "premios_select" on public.premios for select using (ativo or public.eh_admin());

create table if not exists public.premios_ganhadores (
  id uuid primary key default uuid_generate_v4(),
  premio_id uuid not null references public.premios(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  -- mês do ranking que deu o prêmio (1º dia do mês)
  mes date not null,
  status text not null default 'a_entregar' check (status in ('a_entregar', 'entregue', 'cancelado')),
  observacao text check (char_length(observacao) <= 300),
  entregue_em timestamptz,
  criado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (premio_id, perfil_id, mes)
);
create index if not exists premios_ganhadores_perfil_idx on public.premios_ganhadores(perfil_id, criado_em desc);
alter table public.premios_ganhadores enable row level security;
revoke insert, update, delete on public.premios_ganhadores from anon, authenticated;
drop policy if exists "premios_ganhadores_select" on public.premios_ganhadores;
create policy "premios_ganhadores_select" on public.premios_ganhadores
  for select using (perfil_id = auth.uid() or public.eh_admin());
