-- =====================================================================
-- 0026 — Acesso de "crescimento" (quem cuida das métricas e dos leads)
-- =====================================================================
-- Vê só Crescimento e Leads; não mexe em pagamentos, usuários, planos nem
-- configurações. Concedido pelo admin em Admin → Usuários. Só acrescenta.
-- =====================================================================
create table if not exists public.equipe_plataforma (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  papel text not null default 'crescimento' check (papel in ('crescimento')),
  concedido_por uuid references public.perfis(id) on delete set null,
  concedido_em timestamptz not null default now()
);
alter table public.equipe_plataforma enable row level security;
revoke insert, update, delete on public.equipe_plataforma from anon, authenticated;
drop policy if exists "equipe_plataforma_select" on public.equipe_plataforma;
create policy "equipe_plataforma_select" on public.equipe_plataforma for select using (perfil_id = auth.uid() or public.eh_admin());

create or replace function public.eh_crescimento()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.eh_admin() or exists (select 1 from public.equipe_plataforma where perfil_id = auth.uid() and papel = 'crescimento'));
$$;
grant execute on function public.eh_crescimento() to authenticated;

-- ---------------------------------------------------------------------
-- Perfil do negócio: Facebook e "atendimento só com hora marcada" (do BoraAli)
-- ---------------------------------------------------------------------
alter table public.negocios add column if not exists facebook text check (facebook is null or char_length(facebook) <= 120);
alter table public.negocios add column if not exists so_hora_marcada boolean not null default false;
