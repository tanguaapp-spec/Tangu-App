-- =====================================================================
-- TANGUÁ APP — MIGRATION 0021: central de erros do admin
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0020. Idempotente.
--
-- - leitura dos logs pelo admin de verdade (eh_admin(), da 0016 — a regra
--   antiga olhava perfis.papel = 'admin' e escondia os logs de quem virou
--   admin pela tabela administradores_plataforma)
-- - marcar erro como resolvido (quem, quando, anotação)
-- =====================================================================

alter table public.error_logs add column if not exists resolvido_em timestamptz;
alter table public.error_logs add column if not exists resolvido_por uuid references public.perfis(id) on delete set null;
alter table public.error_logs add column if not exists nota_resolucao text check (nota_resolucao is null or char_length(nota_resolucao) <= 500);

create index if not exists error_logs_abertos_idx on public.error_logs(criado_em desc) where resolvido_em is null;

drop policy if exists "error_logs_select_admin" on public.error_logs;
create policy "error_logs_select_admin" on public.error_logs
for select using (public.eh_admin());

-- escrita continua só pelo servidor (service role)
revoke insert, update, delete on public.error_logs from anon, authenticated;
