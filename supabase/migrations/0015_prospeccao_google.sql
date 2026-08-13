-- =====================================================================
-- TANGUÁ APP — MIGRATION 0015: prospecção privada de negócios (Google Maps)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0014.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Tabela 100% privada (só admin, só via /painel/admin/prospeccao) — NUNCA
-- aparece no diretório público. Guarda o que a Google Places API retorna
-- pra comerciantes de Tanguá ainda não cadastrados de verdade no app, pra
-- o admin conseguir ver quem falta convidar e chamar no WhatsApp.
-- =====================================================================

create table if not exists public.prospeccoes_negocios (
  id uuid primary key default uuid_generate_v4(),
  google_place_id text not null unique,
  nome text not null,
  categoria_slug text,
  endereco text,
  bairro text,
  telefone text,
  site text,
  latitude double precision,
  longitude double precision,
  nota_google numeric(2,1),
  total_avaliacoes_google int,
  negocio_vinculado_id uuid references public.negocios(id) on delete set null,
  status text not null default 'novo' check (status in ('novo', 'contactado', 'convidado', 'convertido', 'ignorado')),
  observacoes text,
  sincronizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

comment on table public.prospeccoes_negocios is
  'Lista privada (só admin) de estabelecimentos encontrados no Google Maps ainda não confirmados como cadastro real no Tanguá App — nunca é exibida publicamente.';

create index if not exists prospeccoes_status_idx on public.prospeccoes_negocios(status);
create index if not exists prospeccoes_vinculado_idx on public.prospeccoes_negocios(negocio_vinculado_id);

alter table public.prospeccoes_negocios enable row level security;

-- Nenhuma policy de insert: a sincronização roda só via service role
-- (server action admin-only), nunca pelo client.
drop policy if exists "prospeccoes_select_admin" on public.prospeccoes_negocios;
create policy "prospeccoes_select_admin" on public.prospeccoes_negocios
for select
using (public.meu_papel() = 'admin');

drop policy if exists "prospeccoes_update_admin" on public.prospeccoes_negocios;
create policy "prospeccoes_update_admin" on public.prospeccoes_negocios
for update
using (public.meu_papel() = 'admin');
