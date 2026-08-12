-- =====================================================================
-- TANGUÁ APP — MIGRATION 0006: observabilidade leve (log de erro)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0005.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Não substitui uma ferramenta tipo Sentry (sem alerta em tempo real, sem
-- agrupamento de stack trace) — é o mínimo pra parar de depender só de
-- alguém reportar manualmente quando algo quebra em produção. Todo
-- registro é feito com a service role (não expõe insert pra ninguém).
-- =====================================================================

create table if not exists public.error_logs (
  id uuid primary key default uuid_generate_v4(),
  nivel text not null default 'error' check (nivel in ('error', 'warning')),
  mensagem text not null,
  contexto text,
  stack text,
  url text,
  usuario_id uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now()
);

comment on table public.error_logs is
  'Log de erros de produção (client e server) — só a service role escreve; só admin lê.';

create index if not exists error_logs_criado_em_idx on public.error_logs(criado_em desc);

alter table public.error_logs enable row level security;

drop policy if exists "error_logs_select_admin" on public.error_logs;

-- só admin lê; ninguém insere via RLS (escrita é sempre via service role)
create policy "error_logs_select_admin" on public.error_logs
for select
using (public.meu_papel() = 'admin');
