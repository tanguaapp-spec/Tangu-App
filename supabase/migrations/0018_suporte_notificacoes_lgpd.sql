-- =====================================================================
-- TANGUÁ APP — MIGRATION 0018: suporte, notificações no app, preferências
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0017. Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Chamados de suporte
-- ---------------------------------------------------------------------
create table if not exists public.chamados_suporte (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  negocio_id uuid references public.negocios(id) on delete set null,
  categoria text not null check (categoria in ('conta', 'negocio', 'pagamento', 'publicacao', 'denuncia', 'privacidade', 'outro')),
  assunto text not null check (char_length(assunto) between 5 and 140),
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'escalado', 'resolvido', 'fechado')),
  -- página de origem e navegador, pra entender o problema sem pedir de novo
  contexto jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists chamados_perfil_idx on public.chamados_suporte(perfil_id, criado_em desc);
create index if not exists chamados_status_idx on public.chamados_suporte(status, atualizado_em desc);

create table if not exists public.mensagens_chamado (
  id uuid primary key default uuid_generate_v4(),
  chamado_id uuid not null references public.chamados_suporte(id) on delete cascade,
  autor_id uuid references public.perfis(id) on delete set null,
  do_suporte boolean not null default false,
  corpo text not null check (char_length(corpo) between 1 and 4000),
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_chamado_idx on public.mensagens_chamado(chamado_id, criado_em);

alter table public.chamados_suporte enable row level security;
alter table public.mensagens_chamado enable row level security;

-- escrita de status/mensagens do suporte só pelo servidor (service role)
revoke update, delete on public.chamados_suporte from anon, authenticated;
revoke update, delete on public.mensagens_chamado from anon, authenticated;

drop policy if exists "chamados_select" on public.chamados_suporte;
create policy "chamados_select" on public.chamados_suporte
for select using (perfil_id = auth.uid() or public.eh_admin());

drop policy if exists "chamados_insert_proprio" on public.chamados_suporte;
create policy "chamados_insert_proprio" on public.chamados_suporte
for insert with check (
  perfil_id = auth.uid()
  and status = 'aberto'
  and (negocio_id is null or public.eh_dono_negocio(negocio_id))
);

drop policy if exists "mensagens_select" on public.mensagens_chamado;
create policy "mensagens_select" on public.mensagens_chamado
for select using (
  public.eh_admin()
  or exists (select 1 from public.chamados_suporte c where c.id = chamado_id and c.perfil_id = auth.uid())
);

drop policy if exists "mensagens_insert_proprio" on public.mensagens_chamado;
create policy "mensagens_insert_proprio" on public.mensagens_chamado
for insert with check (
  autor_id = auth.uid()
  and do_suporte = false
  and exists (
    select 1 from public.chamados_suporte c
    where c.id = chamado_id and c.perfil_id = auth.uid() and c.status not in ('fechado')
  )
);

-- ---------------------------------------------------------------------
-- Notificações dentro do app (o sino) — escrita só pelo servidor
-- ---------------------------------------------------------------------
create table if not exists public.notificacoes (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  url text check (url is null or url ~ '^/'),
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_perfil_idx on public.notificacoes(perfil_id, criado_em desc);
create index if not exists notificacoes_nao_lidas_idx on public.notificacoes(perfil_id) where lida_em is null;

alter table public.notificacoes enable row level security;
revoke insert, delete, update on public.notificacoes from anon, authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

drop policy if exists "notificacoes_select_proprio" on public.notificacoes;
create policy "notificacoes_select_proprio" on public.notificacoes
for select using (perfil_id = auth.uid());

drop policy if exists "notificacoes_update_proprio" on public.notificacoes;
create policy "notificacoes_update_proprio" on public.notificacoes
for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- ---------------------------------------------------------------------
-- Preferências de comunicação (opt-out por categoria)
-- Avisos da própria conta (pagamento, suporte, moderação) não entram aqui:
-- são essenciais e sempre chegam no app.
-- ---------------------------------------------------------------------
alter table public.perfis
  add column if not exists preferencias_notificacao jsonb not null
  default '{"novidades_favoritos": true, "ofertas_favoritos": true, "mural": true}'::jsonb;

grant update (preferencias_notificacao) on public.perfis to authenticated;

-- ---------------------------------------------------------------------
-- Denúncia também de negócio e de post (antes só avaliação/aviso/resposta)
-- ---------------------------------------------------------------------
alter type public.tipo_conteudo_denuncia add value if not exists 'negocio';
alter type public.tipo_conteudo_denuncia add value if not exists 'post';
