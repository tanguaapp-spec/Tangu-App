-- =====================================================================
-- TANGUÁ APP — SCHEMA INICIAL
-- =====================================================================
-- Roda no SQL Editor do Supabase (ou via CLI: supabase db push)
-- Pressupõe extensões padrão do Supabase (auth.users já existe)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type user_role as enum ('morador', 'profissional', 'admin');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'claim_status') then
        create type claim_status as enum ('pendente', 'aprovado', 'rejeitado');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'vaga_status') then
        create type vaga_status as enum ('aberta', 'pausada', 'encerrada');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'post_tipo') then
        create type post_tipo as enum ('novidade', 'promocao', 'vaga_propria');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'aviso_tipo') then
        create type aviso_tipo as enum ('aviso', 'evento', 'utilidade_publica', 'achados_perdidos');
    end if;
end $$;

-- ---------------------------------------------------------------------
-- PERFIS DE USUÁRIO (estende auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  telefone text,
  whatsapp text,
  avatar_url text,
  papel user_role not null default 'morador',
  bairro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is 'Dados extras de cada usuário autenticado, vinculados ao auth.users do Supabase.';

-- ---------------------------------------------------------------------
-- CATEGORIAS DE NEGÓCIO/PROFISSÃO
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  slug text not null unique,
  icone text,
  ordem int default 0
);

-- ---------------------------------------------------------------------
-- NEGÓCIOS / PROFISSIONAIS (núcleo do diretório)
-- ---------------------------------------------------------------------
create table if not exists public.negocios (
  id uuid primary key default uuid_generate_v4(),

  -- dados de origem (importação Google Places)
  google_place_id text unique,
  origem text not null default 'importado' check (origem in ('importado', 'cadastro_manual')),

  -- dados básicos
  nome text not null,
  categoria_id uuid references public.categorias(id),
  descricao text,
  endereco text,
  bairro text,
  latitude double precision,
  longitude double precision,
  localizacao geography(Point, 4326),

  -- contato
  telefone text,
  whatsapp text,
  instagram text,
  site text,

  -- horário (json flexível: {"seg": "08:00-18:00", ...})
  horario_funcionamento jsonb,

  -- mídia
  foto_capa_url text,
  galeria jsonb default '[]'::jsonb,

  -- avaliação herdada do Google (apenas referência, não editável)
  nota_google numeric(2,1),
  total_avaliacoes_google int,

  -- status de verificação/reivindicação
  verificado boolean not null default false,
  reivindicado_por uuid references public.perfis(id),
  reivindicado_em timestamptz,

  -- destaque (monetização futura)
  destaque_ativo boolean not null default false,
  destaque_expira_em timestamptz,

  -- extras só preenchidos pelo profissional após reivindicar
  formas_pagamento text[],
  aberto_agora boolean,

  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists negocios_categoria_idx on public.negocios(categoria_id);
create index if not exists negocios_bairro_idx on public.negocios(bairro);
create index if not exists negocios_localizacao_idx on public.negocios using gist(localizacao);
create index if not exists negocios_nome_trgm_idx on public.negocios using gin (nome gin_trgm_ops);

comment on table public.negocios is 'Diretório de profissionais e comércios, populado via Google Places e mantido pelos donos após reivindicação.';

-- trigger: manter geography sincronizado com lat/lng
create or replace function public.sync_localizacao()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.localizacao := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  new.atualizado_em := now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  drop trigger if exists negocios_sync_localizacao on public.negocios;
  create trigger negocios_sync_localizacao
    before insert or update on public.negocios
    for each row execute function public.sync_localizacao();
end $$;

-- ---------------------------------------------------------------------
-- SOLICITAÇÕES DE REIVINDICAÇÃO DE PERFIL
-- ---------------------------------------------------------------------
create table if not exists public.solicitacoes_reivindicacao (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  solicitante_id uuid not null references public.perfis(id) on delete cascade,
  documento_url text,
  mensagem text,
  status claim_status not null default 'pendente',
  revisado_por uuid references public.perfis(id),
  revisado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- POSTS DOS PROFISSIONAIS (feed de novidades/promoções)
-- ---------------------------------------------------------------------
create table if not exists public.posts_negocio (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  autor_id uuid not null references public.perfis(id),
  tipo post_tipo not null default 'novidade',
  titulo text not null,
  conteudo text,
  imagem_url text,
  link_externo text,
  ativo boolean not null default true,
  visualizacoes int not null default 0,
  cliques_contato int not null default 0,
  criado_em timestamptz not null default now(),
  expira_em timestamptz
);

create index if not exists posts_negocio_idx on public.posts_negocio(negocio_id, criado_em desc);

-- ---------------------------------------------------------------------
-- AVALIAÇÕES DA COMUNIDADE
-- ---------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  autor_id uuid not null references public.perfis(id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text,
  resposta_profissional text,
  respondido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (negocio_id, autor_id)
);

-- ---------------------------------------------------------------------
-- VAGAS DE EMPREGO
-- ---------------------------------------------------------------------
create table if not exists public.vagas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  empresa_nome text not null,
  negocio_id uuid references public.negocios(id),
  descricao text not null,
  requisitos text,
  area text,
  tipo_contrato text,
  salario_faixa text,
  bairro text,
  contato_whatsapp text,
  contato_email text,
  status vaga_status not null default 'aberta',
  publicado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz
);

create index if not exists vagas_status_idx on public.vagas(status, criado_em desc);

-- ---------------------------------------------------------------------
-- MURAL DA CIDADE (avisos, eventos, utilidade pública)
-- ---------------------------------------------------------------------
create table if not exists public.avisos_cidade (
  id uuid primary key default uuid_generate_v4(),
  tipo aviso_tipo not null default 'aviso',
  titulo text not null,
  conteudo text not null,
  imagem_url text,
  bairro text,
  local_evento text,
  data_evento timestamptz,
  publicado_por uuid not null references public.perfis(id),
  fixado boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists avisos_tipo_idx on public.avisos_cidade(tipo, criado_em desc);

-- ---------------------------------------------------------------------
-- FAVORITOS
-- ---------------------------------------------------------------------
create table if not exists public.favoritos (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, negocio_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.perfis enable row level security;
alter table public.negocios enable row level security;
alter table public.solicitacoes_reivindicacao enable row level security;
alter table public.posts_negocio enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.vagas enable row level security;
alter table public.avisos_cidade enable row level security;
alter table public.favoritos enable row level security;
alter table public.categorias enable row level security;

-- função auxiliar: papel do usuário atual
create or replace function public.meu_papel()
returns user_role as $$
  select papel from public.perfis where id = auth.uid();
$$ language sql stable security definer;

-- função auxiliar: usuário é dono (reivindicou) do negócio?
create or replace function public.eh_dono_negocio(p_negocio_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.negocios
    where id = p_negocio_id and reivindicado_por = auth.uid()
  );
$$ language sql stable security definer;

-- PERFIS: qualquer um lê, só o próprio usuário edita o seu
drop policy if exists "perfis_select_publico" on public.perfis;
drop policy if exists "perfis_update_proprio" on public.perfis;
drop policy if exists "perfis_insert_proprio" on public.perfis;

create policy "perfis_select_publico" on public.perfis for select using (true);
create policy "perfis_update_proprio" on public.perfis for update using (auth.uid() = id);
create policy "perfis_insert_proprio" on public.perfis for insert with check (auth.uid() = id);

-- CATEGORIAS: leitura pública, escrita só admin
drop policy if exists "categorias_select_publico" on public.categorias;
drop policy if exists "categorias_admin_all" on public.categorias;

create policy "categorias_select_publico" on public.categorias for select using (true);
create policy "categorias_admin_all" on public.categorias for all using (public.meu_papel() = 'admin');

-- NEGÓCIOS: leitura pública; dono ou admin edita
drop policy if exists "negocios_select_publico" on public.negocios;
drop policy if exists "negocios_update_dono_ou_admin" on public.negocios;
drop policy if exists "negocios_insert_admin" on public.negocios;
drop policy if exists "negocios_delete_admin" on public.negocios;

create policy "negocios_select_publico" on public.negocios
for select using (ativo = true or public.meu_papel() = 'admin');

create policy "negocios_update_dono_ou_admin" on public.negocios
for update
using (reivindicado_por = auth.uid() or public.meu_papel() = 'admin');

create policy "negocios_insert_admin" on public.negocios
for insert
with check (public.meu_papel() = 'admin');

create policy "negocios_delete_admin" on public.negocios
for delete
using (public.meu_papel() = 'admin');

-- SOLICITAÇÕES: o solicitante vê a própria; admin vê todas
drop policy if exists "solicitacoes_select_proprio_ou_admin" on public.solicitacoes_reivindicacao;
drop policy if exists "solicitacoes_insert_proprio" on public.solicitacoes_reivindicacao;
drop policy if exists "solicitacoes_update_admin" on public.solicitacoes_reivindicacao;

create policy "solicitacoes_select_proprio_ou_admin" on public.solicitacoes_reivindicacao
for select
using (solicitante_id = auth.uid() or public.meu_papel() = 'admin');

create policy "solicitacoes_insert_proprio" on public.solicitacoes_reivindicacao
for insert
with check (solicitante_id = auth.uid());

create policy "solicitacoes_update_admin" on public.solicitacoes_reivindicacao
for update
using (public.meu_papel() = 'admin');

-- POSTS: leitura pública; dono do negócio ou admin cria/edita
drop policy if exists "posts_select_publico" on public.posts_negocio;
drop policy if exists "posts_insert_dono_ou_admin" on public.posts_negocio;
drop policy if exists "posts_update_dono_ou_admin" on public.posts_negocio;
drop policy if exists "posts_delete_dono_ou_admin" on public.posts_negocio;

create policy "posts_select_publico" on public.posts_negocio
for select
using (ativo = true or public.meu_papel() = 'admin');

create policy "posts_insert_dono_ou_admin" on public.posts_negocio
for insert
with check (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "posts_update_dono_ou_admin" on public.posts_negocio
for update
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

create policy "posts_delete_dono_ou_admin" on public.posts_negocio
for delete
using (public.eh_dono_negocio(negocio_id) or public.meu_papel() = 'admin');

-- AVALIAÇÕES: leitura pública; autor cria/edita a própria
drop policy if exists "avaliacoes_select_publico" on public.avaliacoes;
drop policy if exists "avaliacoes_insert_proprio" on public.avaliacoes;
drop policy if exists "avaliacoes_update_autor_ou_dono" on public.avaliacoes;
drop policy if exists "avaliacoes_delete_autor_ou_admin" on public.avaliacoes;

create policy "avaliacoes_select_publico" on public.avaliacoes
for select
using (true);

create policy "avaliacoes_insert_proprio" on public.avaliacoes
for insert
with check (autor_id = auth.uid());

create policy "avaliacoes_update_autor_ou_dono" on public.avaliacoes
for update
using (
  autor_id = auth.uid()
  or public.eh_dono_negocio(negocio_id)
  or public.meu_papel() = 'admin'
);

create policy "avaliacoes_delete_autor_ou_admin" on public.avaliacoes
for delete
using (autor_id = auth.uid() or public.meu_papel() = 'admin');

-- VAGAS: leitura pública; admin ou dono publica
drop policy if exists "vagas_select_publico" on public.vagas;
drop policy if exists "vagas_insert_autenticado" on public.vagas;
drop policy if exists "vagas_update_dono_ou_admin" on public.vagas;
drop policy if exists "vagas_delete_dono_ou_admin" on public.vagas;

create policy "vagas_select_publico" on public.vagas
for select
using (
  status = 'aberta'
  or public.meu_papel() = 'admin'
  or publicado_por = auth.uid()
);

create policy "vagas_insert_autenticado" on public.vagas
for insert
with check (publicado_por = auth.uid());

create policy "vagas_update_dono_ou_admin" on public.vagas
for update
using (publicado_por = auth.uid() or public.meu_papel() = 'admin');

create policy "vagas_delete_dono_ou_admin" on public.vagas
for delete
using (publicado_por = auth.uid() or public.meu_papel() = 'admin');

-- AVISOS DA CIDADE
drop policy if exists "avisos_select_publico" on public.avisos_cidade;
drop policy if exists "avisos_admin_insert" on public.avisos_cidade;
drop policy if exists "avisos_admin_update" on public.avisos_cidade;
drop policy if exists "avisos_admin_delete" on public.avisos_cidade;

create policy "avisos_select_publico" on public.avisos_cidade
for select
using (ativo = true or public.meu_papel() = 'admin');

create policy "avisos_admin_insert" on public.avisos_cidade
for insert
with check (public.meu_papel() = 'admin');

create policy "avisos_admin_update" on public.avisos_cidade
for update
using (public.meu_papel() = 'admin');

create policy "avisos_admin_delete" on public.avisos_cidade
for delete
using (public.meu_papel() = 'admin');

-- FAVORITOS: cada usuário só vê/gerencia os próprios
drop policy if exists "favoritos_select_proprio" on public.favoritos;
drop policy if exists "favoritos_insert_proprio" on public.favoritos;
drop policy if exists "favoritos_delete_proprio" on public.favoritos;

create policy "favoritos_select_proprio" on public.favoritos
for select
using (perfil_id = auth.uid());

create policy "favoritos_insert_proprio" on public.favoritos
for insert
with check (perfil_id = auth.uid());

create policy "favoritos_delete_proprio" on public.favoritos
for delete
using (perfil_id = auth.uid());

-- =====================================================================
-- =====================================================================
-- TRIGGER: criar perfil automaticamente ao registrar usuário
-- =====================================================================

create or replace function public.handle_novo_usuario()
returns trigger as $$
begin
  insert into public.perfis (id, nome_completo, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', 'Novo usuário'),
    coalesce((new.raw_user_meta_data->>'papel')::user_role, 'morador')
  );

  return new;
end;
$$ language plpgsql security definer;

-- Remove o trigger caso ele já exista
drop trigger if exists on_auth_user_created on auth.users;

-- Cria novamente o trigger
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_novo_usuario();

-- =====================================================================
-- SEED: categorias iniciais
-- =====================================================================
insert into public.categorias (nome, slug, icone, ordem)
values
  ('Alimentação', 'alimentacao', 'utensils', 1),
  ('Saúde e Bem-estar', 'saude-bem-estar', 'heart-pulse', 2),
  ('Beleza e Estética', 'beleza-estetica', 'scissors', 3),
  ('Casa e Construção', 'casa-construcao', 'hammer', 4),
  ('Automotivo', 'automotivo', 'car', 5),
  ('Educação', 'educacao', 'graduation-cap', 6),
  ('Moda e Vestuário', 'moda-vestuario', 'shirt', 7),
  ('Serviços Profissionais', 'servicos-profissionais', 'briefcase', 8),
  ('Agro e Produção Rural', 'agro-producao-rural', 'sprout', 9),
  ('Tecnologia', 'tecnologia', 'laptop', 10),
  ('Eventos e Festas', 'eventos-festas', 'party-popper', 11),
  ('Outros', 'outros', 'store', 99)
on conflict (slug) do nothing;
