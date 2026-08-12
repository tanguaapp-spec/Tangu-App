-- =====================================================================
-- TANGUÁ APP — MIGRATION 0005: catálogo de produtos/serviços com preço
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0004.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

create table if not exists public.produtos_servicos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2),
  preco_a_partir_de boolean not null default false,
  imagem_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.produtos_servicos is
  'Catálogo de produtos/serviços com preço de cada negócio — pra quem procura já saber quanto custa antes de chamar no WhatsApp.';

create index if not exists produtos_servicos_negocio_idx on public.produtos_servicos(negocio_id, ordem);

alter table public.produtos_servicos enable row level security;

drop policy if exists "produtos_select_publico" on public.produtos_servicos;
drop policy if exists "produtos_insert_dono_ou_admin" on public.produtos_servicos;
drop policy if exists "produtos_update_dono_ou_admin" on public.produtos_servicos;
drop policy if exists "produtos_delete_dono_ou_admin" on public.produtos_servicos;

-- mesmo padrão de posts_negocio: leitura pública dos ativos; dono/admin gerencia
create policy "produtos_select_publico" on public.produtos_servicos
for select
using (ativo = true or public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "produtos_insert_dono_ou_admin" on public.produtos_servicos
for insert
with check (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "produtos_update_dono_ou_admin" on public.produtos_servicos
for update
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "produtos_delete_dono_ou_admin" on public.produtos_servicos
for delete
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');
