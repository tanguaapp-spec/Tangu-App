-- =====================================================================
-- TANGUÁ APP — MIGRATION 0022: notificações pra quem ainda não tem conta
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0021. Idempotente.
--
-- Qualquer visitante pode ativar as notificações da cidade (avisos,
-- eventos, comunicados) sem criar conta. A inscrição fica sem perfil
-- (perfil_id nulo) até a pessoa entrar — aí passa a ser dela.
-- Gravação só pelo servidor (que valida o endereço do serviço de push e
-- limita por IP); a API pública não grava inscrição sem dono.
-- =====================================================================

alter table public.push_subscriptions alter column perfil_id drop not null;
alter table public.push_subscriptions add column if not exists atualizado_em timestamptz not null default now();

create index if not exists push_subscriptions_visitantes_idx on public.push_subscriptions(criado_em) where perfil_id is null;

-- a escrita passa a ser só do servidor (service role)
revoke insert, update, delete on public.push_subscriptions from anon, authenticated;
drop policy if exists "push_subscriptions_insert_proprio" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_proprio" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_proprio" on public.push_subscriptions;
