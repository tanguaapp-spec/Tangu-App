-- =====================================================================
-- TANGUÁ APP — MIGRATION 0013: corrige visibilidade de favoritos pro dono
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0012.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Bug real encontrado via teste E2E: a policy original de favoritos
-- (0001_schema_inicial.sql) só deixa cada pessoa ver os PRÓPRIOS
-- favoritos (`perfil_id = auth.uid()`). Isso quebra duas coisas:
--   1. O dono do negócio não consegue ver quem favoritou o perfil dele
--      (cartão fidelidade, Fase C).
--   2. A contagem pública "N pessoas favoritaram" (Fase A) também fica
--      errada pra qualquer um que não seja o próprio favoritador —
--      esse número específico já foi corrigido no código pra usar o
--      cliente de service role, que ignora RLS.
-- =====================================================================

drop policy if exists "favoritos_select_proprio" on public.favoritos;

create policy "favoritos_select_proprio_ou_dono" on public.favoritos
for select
using (
  perfil_id = auth.uid()
  or public.eh_dono_negocio(negocio_id)
  or public.meu_papel() = 'admin'
);
