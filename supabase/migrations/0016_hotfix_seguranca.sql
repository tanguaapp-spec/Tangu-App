-- =====================================================================
-- TANGUÁ APP — MIGRATION 0016: hotfix de segurança (auditoria out/2026)
-- =====================================================================
-- Roda no SQL Editor do Supabase, depois da 0015. Idempotente.
-- APLICAR ANTES de publicar o código desta rodada: o app passa a ler o
-- próprio perfil via RPC meu_perfil() e a checar admin via eh_admin().
--
-- Corrige (ver docs/AUDITORIA-2026-10.md, testes em supabase/tests/):
--  1. signUp com metadata papel=admin criava administrador.
--  2. telefone/WhatsApp/bairro/código de convite de todos os perfis
--     legíveis por qualquer visitante anônimo.
--  3. dono do negócio conseguia alterar nota/comentário de avaliações.
--  4. upload em qualquer caminho do bucket, sem limite de tipo/tamanho.
--  5. vaga vinculada a negócio de outra pessoa.
--  6. verificar_rate_limit chamável pela API pública (dava pra esgotar o
--     limite de login de outro IP de propósito).
--  7. FKs sem ON DELETE impediam excluir uma conta (LGPD).
--  8. link do site do negócio aceitava javascript: (XSS).
-- Admin passa a ser uma tabela própria, sem caminho de escrita pela API.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Admin da plataforma: tabela própria, escrita só por SQL/service role
-- ---------------------------------------------------------------------
create table if not exists public.administradores_plataforma (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  concedido_por uuid references public.perfis(id) on delete set null,
  concedido_em timestamptz not null default now(),
  observacao text
);

comment on table public.administradores_plataforma is
  'Quem administra a PLATAFORMA (não confundir com dono de negócio). Sem policy de escrita: só conceder_admin() via SQL Editor/service role.';

-- Leva os admins atuais. ATENÇÃO: confira essa lista depois de rodar —
-- antes desta migration, qualquer pessoa podia ter se cadastrado como admin.
insert into public.administradores_plataforma (perfil_id, observacao)
select id, 'migrado de perfis.papel na 0016 — conferir'
from public.perfis
where papel = 'admin'
on conflict (perfil_id) do nothing;

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from public.administradores_plataforma where perfil_id = auth.uid());
$$;

-- meu_papel() continua existindo (usada em ~30 policies), mas 'admin' agora
-- vem só da tabela acima — o valor em perfis.papel deixa de valer sozinho.
create or replace function public.meu_papel()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select case
           when public.eh_admin() then 'admin'::public.user_role
           when p.papel = 'admin' then 'morador'::public.user_role
           else p.papel
         end
  from public.perfis p
  where p.id = auth.uid();
$$;

alter table public.administradores_plataforma enable row level security;
revoke all on public.administradores_plataforma from anon, authenticated;
grant select on public.administradores_plataforma to authenticated;
drop policy if exists "admins_select_proprio_ou_admin" on public.administradores_plataforma;
create policy "admins_select_proprio_ou_admin" on public.administradores_plataforma
for select using (perfil_id = auth.uid() or public.eh_admin());

-- Conceder/revogar: só pelo SQL Editor (postgres) ou service role.
create or replace function public.conceder_admin(p_email text, p_observacao text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Usuário com e-mail % não encontrado', p_email;
  end if;
  insert into public.administradores_plataforma (perfil_id, observacao)
  values (v_id, p_observacao)
  on conflict (perfil_id) do update set observacao = excluded.observacao;
  update public.perfis set papel = 'admin' where id = v_id;
  return v_id;
end;
$$;

create or replace function public.revogar_admin(p_email text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  delete from public.administradores_plataforma where perfil_id = v_id;
  update public.perfis set papel = 'morador' where id = v_id and papel = 'admin';
end;
$$;

revoke execute on function public.conceder_admin(text, text) from public, anon, authenticated;
revoke execute on function public.revogar_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Cadastro: só morador ou profissional pelo fluxo público
-- ---------------------------------------------------------------------
create or replace function public.handle_novo_usuario()
returns trigger as $$
declare
  v_convidado_por uuid;
  v_papel_pedido text := new.raw_user_meta_data->>'papel';
begin
  if new.raw_user_meta_data->>'codigo_convite' is not null then
    select id into v_convidado_por
    from public.perfis
    where codigo_convite = new.raw_user_meta_data->>'codigo_convite';
  end if;

  insert into public.perfis (id, nome_completo, papel, convidado_por)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Novo usuário'), 120),
    case when v_papel_pedido = 'profissional' then 'profissional'::public.user_role
         else 'morador'::public.user_role end,
    v_convidado_por
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- papel 'admin' em perfis nunca entra nem sai pela API
create or replace function public.perfis_protege_papel()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.papel = 'admin' then
      new.papel := 'morador';
    end if;
    return new;
  end if;

  if new.papel is distinct from old.papel
     and (new.papel = 'admin' or old.papel = 'admin')
     and auth.uid() is not null
     and not public.eh_admin() then
    new.papel := old.papel;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

do $$ begin
  drop trigger if exists perfis_protege_papel_trigger on public.perfis;
  create trigger perfis_protege_papel_trigger
    before insert or update on public.perfis
    for each row execute function public.perfis_protege_papel();
end $$;

-- ---------------------------------------------------------------------
-- 2. Perfis: dados de contato deixam de ser públicos
-- ---------------------------------------------------------------------
-- Quem aparece publicamente: autor de avaliação (o nome já é exibido na
-- avaliação). O dono de um negócio vê nome de quem favoritou (fidelidade).
create or replace function public.perfil_visivel(p_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_id = auth.uid()
      or public.eh_admin()
      or exists (select 1 from public.avaliacoes a where a.autor_id = p_id)
      or exists (
        select 1 from public.favoritos f
        join public.negocios n on n.id = f.negocio_id
        where f.perfil_id = p_id and n.reivindicado_por = auth.uid()
      );
$$;

drop policy if exists "perfis_select_publico" on public.perfis;
drop policy if exists "perfis_select_visivel" on public.perfis;
create policy "perfis_select_visivel" on public.perfis
for select using (public.perfil_visivel(id));

-- Mesmo nas linhas visíveis, a API só entrega colunas públicas. O próprio
-- usuário lê o perfil completo via meu_perfil(); o servidor usa service role.
revoke select, insert, update on public.perfis from anon, authenticated;
grant select (id, nome_completo, avatar_url, criado_em) on public.perfis to anon, authenticated;
grant update (nome_completo, telefone, whatsapp, avatar_url, bairro, notificacoes_resumo_diario, papel)
  on public.perfis to authenticated;

create or replace function public.meu_perfil()
returns setof public.perfis
language sql stable security definer set search_path = public
as $$
  select * from public.perfis where id = auth.uid();
$$;

revoke execute on function public.meu_perfil() from public, anon;
grant execute on function public.meu_perfil() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Avaliações: autor mexe no conteúdo, dono só na resposta
-- ---------------------------------------------------------------------
create or replace function public.avaliacoes_protege_campos()
returns trigger as $$
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  if auth.uid() = old.autor_id then
    new.resposta_profissional := old.resposta_profissional;
    new.respondido_em := old.respondido_em;
  else
    new.nota := old.nota;
    new.comentario := old.comentario;
    new.foto_url := old.foto_url;
  end if;

  new.negocio_id := old.negocio_id;
  new.autor_id := old.autor_id;
  new.criado_em := old.criado_em;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

do $$ begin
  drop trigger if exists avaliacoes_protege_campos_trigger on public.avaliacoes;
  create trigger avaliacoes_protege_campos_trigger
    before update on public.avaliacoes
    for each row execute function public.avaliacoes_protege_campos();
end $$;

-- ninguém avalia o próprio negócio
drop policy if exists "avaliacoes_insert_proprio" on public.avaliacoes;
create policy "avaliacoes_insert_proprio" on public.avaliacoes
for insert with check (autor_id = auth.uid() and not public.eh_dono_negocio(negocio_id));

-- ---------------------------------------------------------------------
-- 4. Storage: tamanho/tipo no bucket + caminho escopado por dono
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'imagens';

create or replace function public.uuid_ou_nulo(p_texto text)
returns uuid
language plpgsql immutable
as $$
begin
  return p_texto::uuid;
exception when others then
  return null;
end;
$$;

-- Caminhos aceitos para escrita:
--   negocios/<negocio_id>/...   → só o dono do negócio
--   usuarios/<user_id>/...      → só o próprio usuário
drop policy if exists "imagens_insert_autenticado" on storage.objects;
drop policy if exists "imagens_insert_escopado" on storage.objects;
create policy "imagens_insert_escopado" on storage.objects
for insert with check (
  bucket_id = 'imagens'
  and auth.uid() is not null
  and (
    ((storage.foldername(name))[1] = 'negocios'
      and public.eh_dono_negocio(public.uuid_ou_nulo((storage.foldername(name))[2])))
    or ((storage.foldername(name))[1] = 'usuarios'
      and (storage.foldername(name))[2] = auth.uid()::text)
    or public.eh_admin()
  )
);

-- ---------------------------------------------------------------------
-- 5. Vagas e posts: vínculo só com negócio próprio
-- ---------------------------------------------------------------------
drop policy if exists "vagas_insert_autenticado" on public.vagas;
create policy "vagas_insert_autenticado" on public.vagas
for insert with check (
  publicado_por = auth.uid()
  and (negocio_id is null or public.eh_dono_negocio(negocio_id) or public.eh_admin())
);

drop policy if exists "posts_insert_dono_ou_admin" on public.posts_negocio;
create policy "posts_insert_dono_ou_admin" on public.posts_negocio
for insert with check (
  (autor_id = auth.uid() and public.eh_dono_negocio(negocio_id))
  or public.eh_admin()
);

-- ---------------------------------------------------------------------
-- 6. Funções internas fora da API pública
-- ---------------------------------------------------------------------
revoke execute on function public.verificar_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Exclusão de conta possível (FKs passam a SET NULL)
-- ---------------------------------------------------------------------
alter table public.negocios drop constraint if exists negocios_reivindicado_por_fkey;
alter table public.negocios add constraint negocios_reivindicado_por_fkey
  foreign key (reivindicado_por) references public.perfis(id) on delete set null;

alter table public.solicitacoes_reivindicacao drop constraint if exists solicitacoes_reivindicacao_revisado_por_fkey;
alter table public.solicitacoes_reivindicacao add constraint solicitacoes_reivindicacao_revisado_por_fkey
  foreign key (revisado_por) references public.perfis(id) on delete set null;

alter table public.posts_negocio alter column autor_id drop not null;
alter table public.posts_negocio drop constraint if exists posts_negocio_autor_id_fkey;
alter table public.posts_negocio add constraint posts_negocio_autor_id_fkey
  foreign key (autor_id) references public.perfis(id) on delete set null;

alter table public.vagas alter column publicado_por drop not null;
alter table public.vagas drop constraint if exists vagas_publicado_por_fkey;
alter table public.vagas add constraint vagas_publicado_por_fkey
  foreign key (publicado_por) references public.perfis(id) on delete set null;

alter table public.vagas drop constraint if exists vagas_negocio_id_fkey;
alter table public.vagas add constraint vagas_negocio_id_fkey
  foreign key (negocio_id) references public.negocios(id) on delete set null;

alter table public.avisos_cidade alter column publicado_por drop not null;
alter table public.avisos_cidade drop constraint if exists avisos_cidade_publicado_por_fkey;
alter table public.avisos_cidade add constraint avisos_cidade_publicado_por_fkey
  foreign key (publicado_por) references public.perfis(id) on delete set null;

alter table public.denuncias drop constraint if exists denuncias_revisado_por_fkey;
alter table public.denuncias add constraint denuncias_revisado_por_fkey
  foreign key (revisado_por) references public.perfis(id) on delete set null;

-- ---------------------------------------------------------------------
-- 8. Site do negócio só http(s). NOT VALID: não falha por dado antigo;
-- o app também sanitiza na exibição (lib/utils.ts → urlSegura).
-- ---------------------------------------------------------------------
alter table public.negocios drop constraint if exists negocios_site_http;
alter table public.negocios add constraint negocios_site_http
  check (site is null or site ~* '^https?://[^\s]+$') not valid;
