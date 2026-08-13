-- =====================================================================
-- TANGUÁ APP — MIGRATION 0010: Fase B (cupons, eventos de perfil, enum pergunta)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0009_fase_a_confianca_e_habito.sql.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Fica separada da 0011 de propósito: o Postgres não deixa usar um valor de
-- enum novo (aqui, 'pergunta') na MESMA transação em que ele foi criado, e
-- o SQL Editor da Supabase roda cada script colado como uma transação só —
-- então a criação do enum e o que usa 'pergunta' precisam ser duas
-- execuções (dois arquivos) separadas, não um `commit` no meio do script.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CUPONS (oferta relâmpago)
-- ---------------------------------------------------------------------
create table if not exists public.cupons (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  titulo text not null,
  desconto_texto text not null,
  expira_em timestamptz not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists cupons_negocio_idx on public.cupons(negocio_id);
create index if not exists cupons_vigentes_idx on public.cupons(ativo, expira_em);

alter table public.cupons enable row level security;

drop policy if exists "cupons_select_publico" on public.cupons;
drop policy if exists "cupons_insert_dono" on public.cupons;
drop policy if exists "cupons_update_dono" on public.cupons;
drop policy if exists "cupons_delete_dono" on public.cupons;

create policy "cupons_select_publico" on public.cupons
for select
using (
  (ativo = true and expira_em > now())
  or public.eh_dono_negocio(negocio_id)
  or public.meu_papel() = 'admin'
);

create policy "cupons_insert_dono" on public.cupons
for insert
with check (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "cupons_update_dono" on public.cupons
for update
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "cupons_delete_dono" on public.cupons
for delete
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

-- ---------------------------------------------------------------------
-- EVENTOS DE PERFIL (painel "seu desempenho")
-- Escrita só via service role (igual error_logs) — não precisa de policy
-- de insert, evita gente inflar as próprias métricas via API direta.
-- ---------------------------------------------------------------------
create table if not exists public.eventos_perfil (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null check (tipo in ('visualizacao', 'favorito', 'clique_whatsapp')),
  criado_em timestamptz not null default now()
);

create index if not exists eventos_perfil_negocio_tipo_idx on public.eventos_perfil(negocio_id, tipo, criado_em desc);

alter table public.eventos_perfil enable row level security;

drop policy if exists "eventos_perfil_select_dono" on public.eventos_perfil;
create policy "eventos_perfil_select_dono" on public.eventos_perfil
for select
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

-- ---------------------------------------------------------------------
-- Novo valor de enum pro mural — "pergunta". Usado só a partir da 0011.
-- ---------------------------------------------------------------------
do $$ begin
  alter type public.aviso_tipo add value if not exists 'pergunta';
exception
  when duplicate_object then null;
end $$;
