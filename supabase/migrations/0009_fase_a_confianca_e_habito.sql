-- =====================================================================
-- TANGUÁ APP — MIGRATION 0009: Fase A (confiança & loop diário)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0008_modalidade_atendimento.sql.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Avaliação com foto (opcional)
-- ---------------------------------------------------------------------
alter table public.avaliacoes
  add column if not exists foto_url text;

comment on column public.avaliacoes.foto_url is
  'Foto opcional anexada pelo autor da avaliação, no bucket imagens.';

-- ---------------------------------------------------------------------
-- Opt-out do resumo diário do bairro (push)
-- ---------------------------------------------------------------------
alter table public.perfis
  add column if not exists notificacoes_resumo_diario boolean not null default true;

comment on column public.perfis.notificacoes_resumo_diario is
  'Se o morador quer receber o resumo diário (push) do que rolou no bairro dele.';
