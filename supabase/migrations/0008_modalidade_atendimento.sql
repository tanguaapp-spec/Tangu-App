-- =====================================================================
-- TANGUÁ APP — MIGRATION 0008: modalidade de atendimento do negócio
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0007_rate_limiting.sql.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Um negócio pode atender de mais de um jeito ao mesmo tempo (ex.: salão
-- com loja física que também vai a domicílio). Por isso é um array, não
-- uma coluna única.
-- =====================================================================

do $$ begin
  create type modalidade_atendimento as enum (
    'loja_fisica',      -- ponto comercial com endereço, cliente vai até lá
    'atende_em_casa',   -- endereço residencial, cliente vai até lá combinando antes
    'atende_domicilio', -- o profissional vai até o cliente
    'servico_digital'   -- 100% remoto, endereço não é relevante
  );
exception
  when duplicate_object then null;
end $$;

alter table public.negocios
  add column if not exists modalidades_atendimento modalidade_atendimento[] not null default '{}';

comment on column public.negocios.modalidades_atendimento is
  'Como o negócio atende o cliente. Pode ter mais de um valor (ex.: loja física + atende a domicílio).';

create index if not exists negocios_modalidades_idx
  on public.negocios using gin (modalidades_atendimento);
