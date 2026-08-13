-- =====================================================================
-- TANGUÁ APP — MIGRATION 0014: denúncias / moderação de conteúdo
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0013.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Qualquer usuário logado pode denunciar uma avaliação, um aviso/pergunta
-- do mural ou uma resposta de negócio a uma pergunta. Só admin lê e revisa.
-- A ação de remoção de fato (apagar a avaliação, desativar o aviso etc.)
-- é feita pelo server action, não por trigger — fica mais fácil de auditar
-- e de notificar quem denunciou.
-- =====================================================================

do $$ begin
  create type tipo_conteudo_denuncia as enum ('avaliacao', 'aviso', 'resposta_pergunta');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.denuncias (
  id uuid primary key default uuid_generate_v4(),
  tipo_conteudo tipo_conteudo_denuncia not null,
  conteudo_id uuid not null,
  negocio_id uuid references public.negocios(id) on delete cascade,
  motivo text not null,
  denunciante_id uuid not null references public.perfis(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'removido', 'arquivado')),
  revisado_por uuid references public.perfis(id),
  revisado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (tipo_conteudo, conteudo_id, denunciante_id)
);

comment on table public.denuncias is
  'Denúncias de conteúdo enviado por usuários (avaliação, aviso/pergunta do mural, resposta de negócio a pergunta) — revisadas manualmente pelo admin.';

create index if not exists denuncias_status_idx on public.denuncias(status, criado_em desc);

alter table public.denuncias enable row level security;

drop policy if exists "denuncias_insert_proprio" on public.denuncias;
create policy "denuncias_insert_proprio" on public.denuncias
for insert
with check (denunciante_id = auth.uid());

drop policy if exists "denuncias_select_admin" on public.denuncias;
create policy "denuncias_select_admin" on public.denuncias
for select
using (public.meu_papel() = 'admin');

drop policy if exists "denuncias_update_admin" on public.denuncias;
create policy "denuncias_update_admin" on public.denuncias
for update
using (public.meu_papel() = 'admin');
