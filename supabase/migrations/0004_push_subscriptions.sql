-- =====================================================================
-- TANGUÁ APP — MIGRATION 0004: notificações Web Push
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0003.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Inscrições de notificação Web Push por dispositivo/navegador (via PWA instalado). Uma pessoa pode ter várias (celular + computador).';

create index if not exists push_subscriptions_perfil_idx on public.push_subscriptions(perfil_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_proprio" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_proprio" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_proprio" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_proprio" on public.push_subscriptions;

-- cada pessoa só vê/gerencia as próprias inscrições; o envio em si roda
-- com a service role (server-side), que ignora RLS.
create policy "push_subscriptions_select_proprio" on public.push_subscriptions
for select using (perfil_id = auth.uid());

create policy "push_subscriptions_insert_proprio" on public.push_subscriptions
for insert with check (perfil_id = auth.uid());

-- necessário pro upsert (mesmo endpoint resubscrevendo, ex: trocou de conta no mesmo aparelho)
create policy "push_subscriptions_update_proprio" on public.push_subscriptions
for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

create policy "push_subscriptions_delete_proprio" on public.push_subscriptions
for delete using (perfil_id = auth.uid());
