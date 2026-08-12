-- =====================================================================
-- TANGUÁ APP — MIGRATION 0003: corrige "type user_role does not exist"
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0002_autocadastro_e_seguranca.sql.
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
--
-- Causa raiz (confirmada nos Postgres Logs do Supabase, erro 42704):
-- a trigger public.handle_novo_usuario() (criada na migration 0001) faz um
-- cast `(...)::user_role` sem qualificar o schema. Funções SECURITY
-- DEFINER rodam com search_path restrito por padrão de segurança do
-- Postgres/Supabase, então o Postgres não encontra o tipo `user_role`
-- (que vive em `public`) e a criação de conta inteira falha com
-- "Database error saving new user".
--
-- Corrige qualificando o tipo (`public.user_role`) e, como blindagem pra
-- essa classe inteira de bug não voltar, fixa `search_path = public` em
-- todas as funções SECURITY DEFINER do projeto.
-- =====================================================================

create or replace function public.handle_novo_usuario()
returns trigger as $$
begin
  insert into public.perfis (id, nome_completo, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', 'Novo usuário'),
    coalesce((new.raw_user_meta_data->>'papel')::public.user_role, 'morador')
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.meu_papel()
returns user_role as $$
  select papel from public.perfis where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function public.eh_dono_negocio(p_negocio_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.negocios
    where id = p_negocio_id and reivindicado_por = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.negocios_protege_campos_admin()
returns trigger as $$
begin
  if public.meu_papel() <> 'admin' then
    new.verificado := old.verificado;
    new.destaque_ativo := old.destaque_ativo;
    new.destaque_expira_em := old.destaque_expira_em;
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
$$ language plpgsql security definer set search_path = public;

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
$$ language plpgsql security definer set search_path = public;
