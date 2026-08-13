-- =====================================================================
-- TANGUÁ APP — MIGRATION 0012: Fase C (moeda "Laranjas" + fidelidade digital)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0011.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PONTOS "LARANJAS" — ledger (soma = saldo), nunca um contador mutável.
-- Escrita só via service role (igual eventos_perfil) — evita qualquer
-- forma de inflar o próprio saldo direto pela API.
-- ---------------------------------------------------------------------
create table if not exists public.pontos_laranjas (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  quantidade int not null,
  motivo text not null,
  criado_em timestamptz not null default now()
);

create index if not exists pontos_laranjas_perfil_idx on public.pontos_laranjas(perfil_id, criado_em desc);

alter table public.pontos_laranjas enable row level security;

drop policy if exists "pontos_laranjas_select_proprio" on public.pontos_laranjas;
create policy "pontos_laranjas_select_proprio" on public.pontos_laranjas
for select using (perfil_id = auth.uid() or public.meu_papel() = 'admin');

-- ---------------------------------------------------------------------
-- CARTÃO FIDELIDADE DIGITAL (carimbo) — por negócio, por cliente.
-- Escrita só via service role: o dono aciona pela tela dele, mas quem
-- grava é sempre o server, nunca o cliente sozinho nem o dono direto via API.
-- ---------------------------------------------------------------------
create table if not exists public.cartoes_fidelidade (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  carimbos int not null default 0,
  meta int not null default 10,
  completos int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (negocio_id, perfil_id)
);

create index if not exists cartoes_fidelidade_perfil_idx on public.cartoes_fidelidade(perfil_id);
create index if not exists cartoes_fidelidade_negocio_idx on public.cartoes_fidelidade(negocio_id);

alter table public.cartoes_fidelidade enable row level security;

drop policy if exists "cartoes_select_proprio_ou_dono" on public.cartoes_fidelidade;
create policy "cartoes_select_proprio_ou_dono" on public.cartoes_fidelidade
for select using (perfil_id = auth.uid() or public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');
