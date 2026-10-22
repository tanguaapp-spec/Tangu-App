-- =====================================================================
-- TANGUÁ APP — MIGRATION 0019: resgate de cupom + pedidos de orçamento
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0018. Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CUPONS: condições, agendamento, preço de/por, limite de resgates
-- ---------------------------------------------------------------------
alter table public.cupons add column if not exists condicoes text;
alter table public.cupons add column if not exists inicia_em timestamptz not null default now();
alter table public.cupons add column if not exists limite_resgates int check (limite_resgates is null or limite_resgates > 0);
alter table public.cupons add column if not exists resgates_count int not null default 0;
alter table public.cupons add column if not exists preco_original_centavos int check (preco_original_centavos is null or preco_original_centavos > 0);
alter table public.cupons add column if not exists preco_promocional_centavos int check (preco_promocional_centavos is null or preco_promocional_centavos >= 0);

alter table public.cupons drop constraint if exists cupons_precos_coerentes;
alter table public.cupons add constraint cupons_precos_coerentes check (
  (preco_original_centavos is null and preco_promocional_centavos is null)
  or (preco_original_centavos is not null and preco_promocional_centavos is not null
      and preco_promocional_centavos < preco_original_centavos)
);
-- Cupons antigos ganharam inicia_em = now() no ADD COLUMN acima; os já
-- vencidos ficariam com expira_em < inicia_em e quebrariam a regra abaixo.
-- O início real de um cupom antigo é quando ele foi criado.
update public.cupons
set inicia_em = least(criado_em, expira_em - interval '1 second')
where inicia_em >= expira_em or inicia_em > criado_em;

alter table public.cupons drop constraint if exists cupons_janela_valida;
alter table public.cupons add constraint cupons_janela_valida check (expira_em > inicia_em);

-- leitura pública só do que já começou e não venceu
drop policy if exists "cupons_select_publico" on public.cupons;
create policy "cupons_select_publico" on public.cupons
for select using (
  (ativo = true and expira_em > now() and inicia_em <= now())
  or public.eh_dono_negocio(negocio_id)
  or public.eh_admin()
);

-- contador só muda pela função de resgate
create or replace function public.cupons_protege_contador()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- 'tangua.resgate' só é ligado por resgatar_cupom() (set_config não é
  -- exposto pela API — fica em pg_catalog, fora dos schemas do PostgREST)
  if auth.uid() is not null and not public.eh_admin()
     and coalesce(current_setting('tangua.resgate', true), '') <> '1' then
    new.resgates_count := old.resgates_count;
  end if;
  return new;
end;
$$;

do $$ begin
  drop trigger if exists cupons_protege_contador_trigger on public.cupons;
  create trigger cupons_protege_contador_trigger before update on public.cupons
    for each row execute function public.cupons_protege_contador();
end $$;

create table if not exists public.cupom_resgates (
  id uuid primary key default uuid_generate_v4(),
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  perfil_id uuid references public.perfis(id) on delete set null,
  codigo text not null unique,
  criado_em timestamptz not null default now(),
  usado_em timestamptz,
  unique (cupom_id, perfil_id)
);

create index if not exists cupom_resgates_cupom_idx on public.cupom_resgates(cupom_id);

alter table public.cupom_resgates enable row level security;
revoke insert, update, delete on public.cupom_resgates from anon, authenticated;

drop policy if exists "resgates_select" on public.cupom_resgates;
create policy "resgates_select" on public.cupom_resgates
for select using (
  perfil_id = auth.uid()
  or public.eh_admin()
  or exists (select 1 from public.cupons c where c.id = cupom_id and public.eh_dono_negocio(c.negocio_id))
);

-- Resgate atômico: trava a linha do cupom (FOR UPDATE) → dois resgates
-- simultâneos nunca passam do limite. Repetir devolve o mesmo código.
create or replace function public.resgatar_cupom(p_cupom_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_cupom public.cupons%rowtype;
  v_codigo text;
  v_ativo_negocio boolean;
begin
  if auth.uid() is null then
    raise exception 'CUPOM:login' using errcode = 'P0001';
  end if;

  select * into v_cupom from public.cupons where id = p_cupom_id for update;
  if not found then raise exception 'CUPOM:inexistente' using errcode = 'P0001'; end if;

  select codigo into v_codigo from public.cupom_resgates where cupom_id = p_cupom_id and perfil_id = auth.uid();
  if v_codigo is not null then return v_codigo; end if;

  select (ativo and status_cadastro = 'aprovado') into v_ativo_negocio from public.negocios where id = v_cupom.negocio_id;
  if not coalesce(v_ativo_negocio, false) or not v_cupom.ativo then
    raise exception 'CUPOM:indisponivel' using errcode = 'P0001';
  end if;
  if v_cupom.inicia_em > now() then raise exception 'CUPOM:agendado' using errcode = 'P0001'; end if;
  if v_cupom.expira_em <= now() then raise exception 'CUPOM:expirado' using errcode = 'P0001'; end if;
  if public.eh_dono_negocio(v_cupom.negocio_id) then raise exception 'CUPOM:proprio' using errcode = 'P0001'; end if;
  if v_cupom.limite_resgates is not null and v_cupom.resgates_count >= v_cupom.limite_resgates then
    raise exception 'CUPOM:esgotado' using errcode = 'P0001';
  end if;

  -- 8 caracteres sem 0/O/1/I pra ditar no balcão sem confusão
  loop
    v_codigo := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 8)
    );
    exit when not exists (select 1 from public.cupom_resgates where codigo = v_codigo);
  end loop;

  insert into public.cupom_resgates (cupom_id, perfil_id, codigo) values (p_cupom_id, auth.uid(), v_codigo);
  perform set_config('tangua.resgate', '1', true);
  update public.cupons set resgates_count = resgates_count + 1 where id = p_cupom_id;
  perform set_config('tangua.resgate', '', true);
  return v_codigo;
end;
$$;

revoke execute on function public.resgatar_cupom(uuid) from public, anon;
grant execute on function public.resgatar_cupom(uuid) to authenticated;

-- Dono confirma o uso no balcão. Só cupons do próprio negócio; uso único.
create or replace function public.validar_codigo_cupom(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_resgate public.cupom_resgates%rowtype;
  v_cupom public.cupons%rowtype;
begin
  select * into v_resgate from public.cupom_resgates where codigo = upper(trim(p_codigo)) for update;
  if not found then return jsonb_build_object('resultado', 'inexistente'); end if;
  select * into v_cupom from public.cupons where id = v_resgate.cupom_id;
  if not public.eh_dono_negocio(v_cupom.negocio_id) then
    -- mesmo retorno de "inexistente": não revela código de outro negócio
    return jsonb_build_object('resultado', 'inexistente');
  end if;
  if v_resgate.usado_em is not null then
    return jsonb_build_object('resultado', 'ja_usado', 'usado_em', v_resgate.usado_em, 'titulo', v_cupom.titulo);
  end if;
  update public.cupom_resgates set usado_em = now() where id = v_resgate.id;
  return jsonb_build_object('resultado', 'ok', 'titulo', v_cupom.titulo, 'desconto', v_cupom.desconto_texto);
end;
$$;

revoke execute on function public.validar_codigo_cupom(text) from public, anon;
grant execute on function public.validar_codigo_cupom(text) to authenticated;

-- ---------------------------------------------------------------------
-- PEDIDOS DE ORÇAMENTO
-- O morador descreve a necessidade; só os negócios escolhidos (ou, com
-- consentimento, os da categoria) recebem. Contato do morador nunca é
-- exposto: a conversa é pelo app e o morador decide chamar no WhatsApp.
-- ---------------------------------------------------------------------
create table if not exists public.pedidos_orcamento (
  id uuid primary key default uuid_generate_v4(),
  solicitante_id uuid references public.perfis(id) on delete cascade,
  categoria_id uuid references public.categorias(id),
  titulo text not null check (char_length(titulo) between 5 and 120),
  descricao text not null check (char_length(descricao) between 10 and 2000),
  bairro text check (bairro is null or char_length(bairro) <= 100),
  status text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days',
  encerrado_em timestamptz
);

create table if not exists public.pedido_destinatarios (
  pedido_id uuid not null references public.pedidos_orcamento(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  visto_em timestamptz,
  criado_em timestamptz not null default now(),
  primary key (pedido_id, negocio_id)
);

create table if not exists public.respostas_orcamento (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references public.pedidos_orcamento(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  mensagem text not null check (char_length(mensagem) between 2 and 2000),
  valor_centavos int check (valor_centavos is null or valor_centavos >= 0),
  prazo text check (prazo is null or char_length(prazo) <= 100),
  criado_em timestamptz not null default now()
);

create index if not exists pedidos_solicitante_idx on public.pedidos_orcamento(solicitante_id, criado_em desc);
create index if not exists destinatarios_negocio_idx on public.pedido_destinatarios(negocio_id, criado_em desc);
create index if not exists respostas_orcamento_pedido_idx on public.respostas_orcamento(pedido_id, criado_em);

create or replace function public.eh_destinatario_pedido(p_pedido uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.pedido_destinatarios d
    join public.negocios n on n.id = d.negocio_id
    where d.pedido_id = p_pedido and n.reivindicado_por = auth.uid()
  );
$$;

alter table public.pedidos_orcamento enable row level security;
alter table public.pedido_destinatarios enable row level security;
alter table public.respostas_orcamento enable row level security;

-- status/encerramento e destinatários: só pelo servidor
revoke update, delete on public.pedidos_orcamento from anon, authenticated;
revoke insert, update, delete on public.pedido_destinatarios from anon, authenticated;
revoke update, delete on public.respostas_orcamento from anon, authenticated;

drop policy if exists "pedidos_select" on public.pedidos_orcamento;
create policy "pedidos_select" on public.pedidos_orcamento
for select using (solicitante_id = auth.uid() or public.eh_destinatario_pedido(id) or public.eh_admin());

drop policy if exists "pedidos_insert_proprio" on public.pedidos_orcamento;
create policy "pedidos_insert_proprio" on public.pedidos_orcamento
for insert with check (solicitante_id = auth.uid() and status = 'aberto');

drop policy if exists "destinatarios_select" on public.pedido_destinatarios;
create policy "destinatarios_select" on public.pedido_destinatarios
for select using (
  public.eh_dono_negocio(negocio_id)
  or public.eh_admin()
  or exists (select 1 from public.pedidos_orcamento p where p.id = pedido_id and p.solicitante_id = auth.uid())
);

drop policy if exists "respostas_orc_select" on public.respostas_orcamento;
create policy "respostas_orc_select" on public.respostas_orcamento
for select using (
  public.eh_dono_negocio(negocio_id)
  or public.eh_admin()
  or exists (select 1 from public.pedidos_orcamento p where p.id = pedido_id and p.solicitante_id = auth.uid())
);

drop policy if exists "respostas_orc_insert" on public.respostas_orcamento;
create policy "respostas_orc_insert" on public.respostas_orcamento
for insert with check (
  public.eh_dono_negocio(negocio_id)
  and exists (select 1 from public.pedido_destinatarios d where d.pedido_id = pedido_id and d.negocio_id = respostas_orcamento.negocio_id)
  and exists (select 1 from public.pedidos_orcamento p where p.id = pedido_id and p.status = 'aberto' and p.expira_em > now())
);
