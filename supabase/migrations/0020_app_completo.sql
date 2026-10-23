-- =====================================================================
-- TANGUÁ APP — MIGRATION 0020: base das melhorias de produto (out/2026)
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0019. Idempotente.
--
-- - nota média da comunidade nos negócios (mantida por trigger)
-- - endereço amigável (slug) por negócio
-- - colaboradores por negócio (gerente/atendente)
-- - interesse em eventos, favoritar produto, lembrete de avaliação
-- - origem das visitas e do cadastro; aparições do Destaque
-- - teste grátis e bônus de indicação (cortesias de plano)
-- - verificação e suspensão registradas
-- =====================================================================

-- ---------------------------------------------------------------------
-- Campos novos em negocios (todos administrativos/automáticos, exceto
-- respostas_prontas, que o dono edita)
-- ---------------------------------------------------------------------
alter table public.negocios add column if not exists slug text;
alter table public.negocios add column if not exists nota_media numeric(2,1);
alter table public.negocios add column if not exists total_avaliacoes int not null default 0;
alter table public.negocios add column if not exists verificado_em timestamptz;
alter table public.negocios add column if not exists verificacao_nota text;
alter table public.negocios add column if not exists respostas_prontas text[] not null default '{}';

create unique index if not exists negocios_slug_idx on public.negocios(slug);

-- slug: minúsculas, sem acento, só [a-z0-9-]
create or replace function public.slugificar(p_texto text)
returns text
language sql immutable
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_texto, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.negocios_definir_slug()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;
  v_base := left(nullif(public.slugificar(new.nome), ''), 60);
  if v_base is null then v_base := 'negocio'; end if;
  v_slug := v_base;
  while exists (select 1 from public.negocios where slug = v_slug and id <> new.id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  new.slug := v_slug;
  return new;
end;
$$;

do $$ begin
  drop trigger if exists negocios_definir_slug_trigger on public.negocios;
  create trigger negocios_definir_slug_trigger before insert or update on public.negocios
    for each row execute function public.negocios_definir_slug();
end $$;

-- preenche os existentes (o trigger acima gera o slug)
update public.negocios set slug = null where slug is null;

-- ---------------------------------------------------------------------
-- Campos administrativos: dono não mexe; o próprio sistema (triggers
-- marcados com tangua.sistema) e o admin podem.
-- ---------------------------------------------------------------------
create or replace function public.negocios_protege_campos_admin()
returns trigger as $$
begin
  if auth.uid() is not null and not public.eh_admin()
     and coalesce(current_setting('tangua.sistema', true), '') <> '1' then
    new.verificado := old.verificado;
    new.verificado_em := old.verificado_em;
    new.verificacao_nota := old.verificacao_nota;
    new.destaque_ativo := old.destaque_ativo;
    new.destaque_expira_em := old.destaque_expira_em;
    new.nota_media := old.nota_media;
    new.total_avaliacoes := old.total_avaliacoes;
    new.slug := old.slug;
    if old.status_cadastro = 'rejeitado' and new.status_cadastro = 'pendente' then
      new.motivo_rejeicao := null;
      new.motivo_moderacao := 'Reenviado após recusa.';
    else
      new.status_cadastro := old.status_cadastro;
      new.motivo_rejeicao := old.motivo_rejeicao;
      new.motivo_moderacao := old.motivo_moderacao;
    end if;
    new.origem := old.origem;
    new.google_place_id := old.google_place_id;
    new.nota_google := old.nota_google;
    new.total_avaliacoes_google := old.total_avaliacoes_google;
    new.reivindicado_por := old.reivindicado_por;
    new.reivindicado_em := old.reivindicado_em;
    new.criado_em := old.criado_em;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- Nota média da comunidade
-- ---------------------------------------------------------------------
create or replace function public.recalcular_nota_negocio(p_negocio uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('tangua.sistema', '1', true);
  update public.negocios n
  set nota_media = s.media, total_avaliacoes = s.total
  from (
    select round(avg(nota)::numeric, 1) as media, count(*)::int as total
    from public.avaliacoes where negocio_id = p_negocio
  ) s
  where n.id = p_negocio;
  perform set_config('tangua.sistema', '', true);
end;
$$;
revoke execute on function public.recalcular_nota_negocio(uuid) from public, anon, authenticated;

create or replace function public.avaliacoes_atualiza_nota()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recalcular_nota_negocio(coalesce(new.negocio_id, old.negocio_id));
  return null;
end;
$$;

do $$ begin
  drop trigger if exists avaliacoes_atualiza_nota_trigger on public.avaliacoes;
  create trigger avaliacoes_atualiza_nota_trigger after insert or update of nota or delete on public.avaliacoes
    for each row execute function public.avaliacoes_atualiza_nota();
end $$;

do $$ declare r record; begin
  for r in select distinct negocio_id from public.avaliacoes loop
    perform public.recalcular_nota_negocio(r.negocio_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Colaboradores: gerente/atendente gerenciam conteúdo (catálogo, ofertas,
-- novidades, orçamentos); perfil e cobrança continuam só do dono.
-- ---------------------------------------------------------------------
create table if not exists public.membros_negocio (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  papel text not null default 'atendente' check (papel in ('gerente', 'atendente')),
  convidado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key (negocio_id, perfil_id)
);

create index if not exists membros_negocio_perfil_idx on public.membros_negocio(perfil_id);

alter table public.membros_negocio enable row level security;
revoke insert, update, delete on public.membros_negocio from anon, authenticated;
drop policy if exists "membros_select" on public.membros_negocio;
create policy "membros_select" on public.membros_negocio
for select using (
  perfil_id = auth.uid()
  or public.eh_admin()
  or exists (select 1 from public.negocios n where n.id = negocio_id and n.reivindicado_por = auth.uid())
);

-- "pode gerir o conteúdo deste negócio": dono OU membro. Mantém o nome
-- antigo (usado em ~25 policies) pra todas passarem a aceitar membros.
create or replace function public.eh_dono_negocio(p_negocio_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.negocios where id = p_negocio_id and reivindicado_por = auth.uid())
      or exists (select 1 from public.membros_negocio where negocio_id = p_negocio_id and perfil_id = auth.uid());
$$;

-- só o dono de verdade (cobrança, equipe, dados do perfil)
create or replace function public.eh_titular_negocio(p_negocio_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.negocios where id = p_negocio_id and reivindicado_por = auth.uid());
$$;

drop policy if exists "assinaturas_select_dono_ou_admin" on public.assinaturas;
create policy "assinaturas_select_dono_ou_admin" on public.assinaturas
for select using (public.eh_titular_negocio(negocio_id) or public.eh_admin());

drop policy if exists "pagamentos_select_dono_ou_admin" on public.pagamentos;
create policy "pagamentos_select_dono_ou_admin" on public.pagamentos
for select using ((negocio_id is not null and public.eh_titular_negocio(negocio_id)) or public.eh_admin());

-- orçamentos recebidos: membros também atendem
create or replace function public.eh_destinatario_pedido(p_pedido uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.pedido_destinatarios d
    where d.pedido_id = p_pedido and public.eh_dono_negocio(d.negocio_id)
  );
$$;

-- e-mail → perfil, pra convidar colaborador. Só o servidor chama.
create or replace function public.perfil_id_por_email(p_email text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke execute on function public.perfil_id_por_email(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Interesse em eventos (salvar + lembrete na véspera)
-- ---------------------------------------------------------------------
create table if not exists public.interesses_evento (
  aviso_id uuid not null references public.avisos_cidade(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  lembrado_em timestamptz,
  criado_em timestamptz not null default now(),
  primary key (aviso_id, perfil_id)
);

alter table public.interesses_evento enable row level security;
revoke update on public.interesses_evento from anon, authenticated;
drop policy if exists "interesses_select" on public.interesses_evento;
create policy "interesses_select" on public.interesses_evento for select using (perfil_id = auth.uid() or public.eh_admin());
drop policy if exists "interesses_insert" on public.interesses_evento;
create policy "interesses_insert" on public.interesses_evento for insert with check (perfil_id = auth.uid());
drop policy if exists "interesses_delete" on public.interesses_evento;
create policy "interesses_delete" on public.interesses_evento for delete using (perfil_id = auth.uid());

-- contagem pública de interessados, sem expor quem
create or replace function public.total_interessados(p_aviso uuid)
returns int
language sql stable security definer set search_path = public
as $$ select count(*)::int from public.interesses_evento where aviso_id = p_aviso; $$;

-- ---------------------------------------------------------------------
-- Favoritar produto/serviço
-- ---------------------------------------------------------------------
create table if not exists public.favoritos_produtos (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  produto_id uuid not null references public.produtos_servicos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, produto_id)
);

alter table public.favoritos_produtos enable row level security;
revoke update on public.favoritos_produtos from anon, authenticated;
drop policy if exists "fav_prod_select" on public.favoritos_produtos;
create policy "fav_prod_select" on public.favoritos_produtos for select using (perfil_id = auth.uid());
drop policy if exists "fav_prod_insert" on public.favoritos_produtos;
create policy "fav_prod_insert" on public.favoritos_produtos for insert with check (perfil_id = auth.uid());
drop policy if exists "fav_prod_delete" on public.favoritos_produtos;
create policy "fav_prod_delete" on public.favoritos_produtos for delete using (perfil_id = auth.uid());

-- ---------------------------------------------------------------------
-- Lembrete de avaliação (depois de usar cupom ou chamar no WhatsApp).
-- Só o servidor lê e escreve.
-- ---------------------------------------------------------------------
create table if not exists public.lembretes_avaliacao (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  motivo text not null check (motivo in ('cupom', 'whatsapp')),
  enviar_apos timestamptz not null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, negocio_id)
);

alter table public.lembretes_avaliacao enable row level security;
revoke all on public.lembretes_avaliacao from anon, authenticated;

-- ---------------------------------------------------------------------
-- Origem das visitas (painel do lojista) e aparições do Destaque
-- ---------------------------------------------------------------------
alter table public.eventos_perfil add column if not exists origem text not null default 'direto';
alter table public.eventos_perfil drop constraint if exists eventos_perfil_origem_check;
alter table public.eventos_perfil add constraint eventos_perfil_origem_check
  check (origem in ('busca', 'home', 'compartilhado', 'qr', 'push', 'ofertas', 'direto'));

create table if not exists public.impressoes_destaque (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  dia date not null,
  total int not null default 0,
  primary key (negocio_id, dia)
);

alter table public.impressoes_destaque enable row level security;
revoke insert, update, delete on public.impressoes_destaque from anon, authenticated;
drop policy if exists "impressoes_select" on public.impressoes_destaque;
create policy "impressoes_select" on public.impressoes_destaque
for select using (public.eh_dono_negocio(negocio_id) or public.eh_admin());

create or replace function public.registrar_impressoes(p_ids uuid[])
returns void
language sql security definer set search_path = public
as $$
  insert into public.impressoes_destaque (negocio_id, dia, total)
  select id, (now() at time zone 'America/Sao_Paulo')::date, 1 from unnest(p_ids) as id
  on conflict (negocio_id, dia) do update set total = public.impressoes_destaque.total + 1;
$$;
revoke execute on function public.registrar_impressoes(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Origem do cadastro (de onde veio cada usuário) e suspensão
-- ---------------------------------------------------------------------
alter table public.perfis add column if not exists origem_cadastro text;
alter table public.perfis add column if not exists suspenso_em timestamptz;
alter table public.perfis add column if not exists motivo_suspensao text;

create or replace function public.handle_novo_usuario()
returns trigger as $$
declare
  v_convidado_por uuid;
  v_papel_pedido text := new.raw_user_meta_data->>'papel';
  v_origem text := left(regexp_replace(coalesce(new.raw_user_meta_data->>'origem', ''), '[^a-zA-Z0-9_:.-]', '', 'g'), 60);
begin
  if new.raw_user_meta_data->>'codigo_convite' is not null then
    select id into v_convidado_por
    from public.perfis
    where codigo_convite = new.raw_user_meta_data->>'codigo_convite';
  end if;

  insert into public.perfis (id, nome_completo, papel, convidado_por, origem_cadastro)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Novo usuário'), 120),
    case when v_papel_pedido = 'profissional' then 'profissional'::public.user_role
         else 'morador'::public.user_role end,
    v_convidado_por,
    nullif(v_origem, '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- Orçamentos: morador vê/escolhe resposta; negócio sabe que foi vista
-- ---------------------------------------------------------------------
alter table public.respostas_orcamento add column if not exists vista_em timestamptz;
alter table public.pedidos_orcamento add column if not exists resposta_escolhida_id uuid references public.respostas_orcamento(id) on delete set null;

-- ---------------------------------------------------------------------
-- Cortesias de plano: teste grátis do negócio novo e bônus por indicação.
-- Ficam fora de "assinaturas" pra não misturar com cobrança (MRR,
-- conciliação do Mercado Pago, regra de uma assinatura aberta).
-- ---------------------------------------------------------------------
create table if not exists public.cortesias_plano (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  plano_id text not null references public.planos(id),
  motivo text not null check (motivo in ('teste_gratis', 'indicacao', 'admin')),
  inicio timestamptz not null default now(),
  fim timestamptz not null,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);

create index if not exists cortesias_negocio_idx on public.cortesias_plano(negocio_id, fim desc);

alter table public.cortesias_plano enable row level security;
revoke insert, update, delete on public.cortesias_plano from anon, authenticated;
drop policy if exists "cortesias_select" on public.cortesias_plano;
create policy "cortesias_select" on public.cortesias_plano
for select using (public.eh_titular_negocio(negocio_id) or public.eh_admin());

-- plano efetivo = o mais caro entre assinatura válida e cortesia vigente
create or replace function public.plano_efetivo(p_negocio_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select x.plano_id from (
       select a.plano_id, a.criado_em
         from public.assinaturas a
        where a.negocio_id = p_negocio_id
          and (
            (a.status = 'ativa' and (a.periodo_atual_fim is null or a.periodo_atual_fim > now()
                                     or (a.tolerancia_ate is not null and a.tolerancia_ate > now())))
            or (a.status = 'em_atraso' and a.tolerancia_ate > now())
            or (a.status = 'cancelada' and a.periodo_atual_fim > now())
          )
       union all
       select c.plano_id, c.criado_em
         from public.cortesias_plano c
        where c.negocio_id = p_negocio_id and c.inicio <= now() and c.fim > now()
     ) x
     join public.planos p on p.id = x.plano_id
     order by p.preco_centavos desc, x.criado_em desc
     limit 1),
    'gratuito'
  );
$$;

insert into public.configuracoes_sistema (chave, valor, descricao, publico) values
  ('dias_teste_gratis', '14', 'Dias de plano pago grátis pra todo negócio novo (0 desliga).', true),
  ('plano_teste_gratis', '"profissional"', 'Plano liberado no teste grátis e no bônus de indicação.', true),
  ('dias_bonus_indicacao', '30', 'Dias de plano pago pro negócio de quem indicou, quando o indicado cadastra um negócio (0 desliga).', true)
on conflict (chave) do nothing;

create or replace function public.negocios_cortesias_iniciais()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_dias int := coalesce((public.config_valor('dias_teste_gratis') #>> '{}')::int, 0);
  v_bonus int := coalesce((public.config_valor('dias_bonus_indicacao') #>> '{}')::int, 0);
  v_plano text := coalesce(public.config_valor('plano_teste_gratis') #>> '{}', 'profissional');
  v_padrinho uuid;
  v_negocio_padrinho uuid;
begin
  -- só cadastro feito pelo próprio dono no app (import/admin não ganha)
  if auth.uid() is null or new.origem <> 'cadastro_manual' or new.reivindicado_por is null
     or not exists (select 1 from public.planos where id = v_plano and ativo) then
    return new;
  end if;

  -- teste grátis: uma vez por dono (não renova abrindo negócio atrás de negócio)
  if v_dias > 0 and not exists (
    select 1 from public.cortesias_plano c join public.negocios n on n.id = c.negocio_id
    where c.motivo = 'teste_gratis' and n.reivindicado_por = new.reivindicado_por
  ) then
    insert into public.cortesias_plano (negocio_id, plano_id, motivo, fim)
    values (new.id, v_plano, 'teste_gratis', now() + make_interval(days => v_dias));
  end if;

  -- bônus pra quem indicou: só no primeiro negócio do indicado
  select convidado_por into v_padrinho from public.perfis where id = new.reivindicado_por;
  if v_bonus > 0 and v_padrinho is not null and v_padrinho <> new.reivindicado_por
     and not exists (select 1 from public.negocios where reivindicado_por = new.reivindicado_por and id <> new.id) then
    select id into v_negocio_padrinho from public.negocios
    where reivindicado_por = v_padrinho and ativo order by criado_em limit 1;
    if v_negocio_padrinho is not null then
      insert into public.cortesias_plano (negocio_id, plano_id, motivo, inicio, fim)
      select v_negocio_padrinho, v_plano, 'indicacao', greatest(now(), coalesce(max(fim), now())),
             greatest(now(), coalesce(max(fim), now())) + make_interval(days => v_bonus)
      from public.cortesias_plano where negocio_id = v_negocio_padrinho and fim > now();
    end if;
  end if;
  return new;
end;
$$;

do $$ begin
  drop trigger if exists negocios_cortesias_iniciais_trigger on public.negocios;
  create trigger negocios_cortesias_iniciais_trigger after insert on public.negocios
    for each row execute function public.negocios_cortesias_iniciais();
end $$;

-- avatar do usuário (coluna já existia; agora pode ser editada)
grant update (avatar_url) on public.perfis to authenticated;
