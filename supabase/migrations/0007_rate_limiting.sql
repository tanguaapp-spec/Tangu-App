-- =====================================================================
-- TANGUÁ APP — MIGRATION 0007: rate limiting básico
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0006.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Não é Redis/Upstash (não precisa de conta nova) — é uma tabela simples
-- com uma função atômica (INSERT ... ON CONFLICT numa instrução só, sem
-- race condition entre ler e escrever). Suficiente pra frear spam/abuso
-- num app do tamanho de uma cidade; se o tráfego crescer muito, vale
-- migrar pra uma solução dedicada.
-- =====================================================================

create table if not exists public.rate_limits (
  chave text primary key,
  contagem int not null default 1,
  janela_inicio timestamptz not null default now()
);

comment on table public.rate_limits is
  'Contador de janela deslizante simples pra limitar taxa de ações sensíveis (cadastro, avaliação, reivindicação).';

alter table public.rate_limits enable row level security;
-- sem policy nenhuma pra anon/authenticated: só a função abaixo (security definer) mexe aqui.

create or replace function public.verificar_rate_limit(p_chave text, p_limite int, p_janela_segundos int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contagem int;
begin
  insert into public.rate_limits (chave, contagem, janela_inicio)
  values (p_chave, 1, now())
  on conflict (chave) do update set
    contagem = case
      when now() - public.rate_limits.janela_inicio > make_interval(secs => p_janela_segundos)
        then 1
      else public.rate_limits.contagem + 1
    end,
    janela_inicio = case
      when now() - public.rate_limits.janela_inicio > make_interval(secs => p_janela_segundos)
        then now()
      else public.rate_limits.janela_inicio
    end
  returning contagem into v_contagem;

  return v_contagem <= p_limite;
end;
$$;

comment on function public.verificar_rate_limit is
  'Retorna true se a ação pode prosseguir (ainda dentro do limite), false se estourou. Atômico — sem race condition entre requests concorrentes.';
