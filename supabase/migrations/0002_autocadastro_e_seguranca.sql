-- =====================================================================
-- TANGUÁ APP — MIGRATION 0002: autocadastro de negócio + reforço de RLS
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0001_schema_inicial.sql.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STATUS DE CADASTRO (reaproveita o enum claim_status: pendente/aprovado/rejeitado)
-- ---------------------------------------------------------------------
alter table public.negocios
  add column if not exists status_cadastro claim_status not null default 'aprovado';

alter table public.negocios
  add column if not exists motivo_rejeicao text;

comment on column public.negocios.status_cadastro is
  'Moderação de negócios autocadastrados por profissionais. Importados/criados por admin nascem "aprovado".';

-- Negócios importados ou já existentes continuam aprovados (default cobre isso).

-- ---------------------------------------------------------------------
-- RLS: permitir que o próprio profissional cadastre seu negócio
-- ---------------------------------------------------------------------
drop policy if exists "negocios_select_publico" on public.negocios;
drop policy if exists "negocios_insert_proprio" on public.negocios;

-- leitura pública só de aprovados+ativos; dono e admin sempre veem o próprio/todos
create policy "negocios_select_publico" on public.negocios
for select using (
  (ativo = true and status_cadastro = 'aprovado')
  or public.meu_papel() = 'admin'
  or reivindicado_por = auth.uid()
);

-- profissional cadastra o próprio negócio (sempre nasce pendente, sem selos/destaque)
-- os campos abaixo têm default seguro na tabela (false/null) — fixamos aqui também
-- pra fechar a brecha de alguém inserir via API direta pulando a UI/server action.
create policy "negocios_insert_proprio" on public.negocios
for insert
with check (
  reivindicado_por = auth.uid()
  and origem = 'cadastro_manual'
  and status_cadastro = 'pendente'
  and verificado = false
  and destaque_ativo = false
  and destaque_expira_em is null
  and google_place_id is null
  and nota_google is null
  and total_avaliacoes_google is null
  and public.meu_papel() in ('profissional', 'admin')
);

-- ---------------------------------------------------------------------
-- TRIGGER: campos administrativos de negocios só mudam pela mão do admin
-- (verificado, destaque, status_cadastro, origem/google, avaliação do Google)
-- evita que o dono altere esses campos direto via API, contornando a UI.
-- ---------------------------------------------------------------------
create or replace function public.negocios_protege_campos_admin()
returns trigger as $$
begin
  if public.meu_papel() <> 'admin' then
    new.verificado := old.verificado;
    new.destaque_ativo := old.destaque_ativo;
    new.destaque_expira_em := old.destaque_expira_em;
    -- única transição que o dono pode fazer sozinho: reenviar um cadastro rejeitado
    if old.status_cadastro = 'rejeitado' and new.status_cadastro = 'pendente' then
      new.motivo_rejeicao := null;
    else
      new.status_cadastro := old.status_cadastro;
      new.motivo_rejeicao := old.motivo_rejeicao;
    end if;
    new.origem := old.origem;
    new.google_place_id := old.google_place_id;
    new.nota_google := old.nota_google;
    new.total_avaliacoes_google := old.total_avaliacoes_google;
    new.reivindicado_por := old.reivindicado_por;
    new.reivindicado_em := old.reivindicado_em;
    new.criado_em := old.criado_em;
  end if;
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  drop trigger if exists negocios_protege_campos_admin_trigger on public.negocios;
  create trigger negocios_protege_campos_admin_trigger
    before update on public.negocios
    for each row execute function public.negocios_protege_campos_admin();
end $$;

-- ---------------------------------------------------------------------
-- TRIGGER: só admin promove alguém a admin (fecha brecha de auto-promoção
-- via update direto em public.perfis, já que a policy de update não
-- restringia colunas).
-- ---------------------------------------------------------------------
create or replace function public.perfis_protege_papel()
returns trigger as $$
begin
  if new.papel is distinct from old.papel then
    if new.papel = 'admin' and public.meu_papel() <> 'admin' then
      new.papel := old.papel;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  drop trigger if exists perfis_protege_papel_trigger on public.perfis;
  create trigger perfis_protege_papel_trigger
    before update on public.perfis
    for each row execute function public.perfis_protege_papel();
end $$;

-- ---------------------------------------------------------------------
-- STORAGE: bucket público "imagens" (capa/galeria de negócio, posts, avisos)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists "imagens_select_publico" on storage.objects;
drop policy if exists "imagens_insert_autenticado" on storage.objects;
drop policy if exists "imagens_update_dono" on storage.objects;
drop policy if exists "imagens_delete_dono" on storage.objects;

create policy "imagens_select_publico" on storage.objects
for select using (bucket_id = 'imagens');

create policy "imagens_insert_autenticado" on storage.objects
for insert
with check (bucket_id = 'imagens' and auth.role() = 'authenticated');

create policy "imagens_update_dono" on storage.objects
for update
using (bucket_id = 'imagens' and owner = auth.uid());

create policy "imagens_delete_dono" on storage.objects
for delete
using (bucket_id = 'imagens' and owner = auth.uid());
