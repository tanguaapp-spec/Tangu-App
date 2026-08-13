-- =====================================================================
-- TANGUÁ APP — MIGRATION 0011: Fase B ("Pergunte à cidade" + indique um vizinho)
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0010_fase_b_motor_de_vendas.sql
-- (precisa que o valor 'pergunta' do enum aviso_tipo já esteja commitado).
-- Idempotente: pode ser executada mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "PERGUNTE À CIDADE" — respostas apontando pra negócios
-- ---------------------------------------------------------------------
drop policy if exists "avisos_insert_pergunta" on public.avisos_cidade;
create policy "avisos_insert_pergunta" on public.avisos_cidade
for insert
with check (
  tipo = 'pergunta'
  and publicado_por = auth.uid()
  and fixado = false
);

create table if not exists public.respostas_pergunta (
  id uuid primary key default uuid_generate_v4(),
  aviso_id uuid not null references public.avisos_cidade(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  autor_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (aviso_id, negocio_id, autor_id)
);

create index if not exists respostas_pergunta_aviso_idx on public.respostas_pergunta(aviso_id);

alter table public.respostas_pergunta enable row level security;

drop policy if exists "respostas_pergunta_select_publico" on public.respostas_pergunta;
drop policy if exists "respostas_pergunta_insert_proprio" on public.respostas_pergunta;
drop policy if exists "respostas_pergunta_delete_proprio" on public.respostas_pergunta;

create policy "respostas_pergunta_select_publico" on public.respostas_pergunta
for select using (true);

create policy "respostas_pergunta_insert_proprio" on public.respostas_pergunta
for insert with check (autor_id = auth.uid());

create policy "respostas_pergunta_delete_proprio" on public.respostas_pergunta
for delete using (autor_id = auth.uid() or public.meu_papel() = 'admin');

-- ---------------------------------------------------------------------
-- REAÇÕES NO MURAL (sem comentário livre, de propósito)
-- ---------------------------------------------------------------------
create table if not exists public.reacoes_aviso (
  aviso_id uuid not null references public.avisos_cidade(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in ('gostei', 'parabens', 'obrigado')),
  criado_em timestamptz not null default now(),
  primary key (aviso_id, perfil_id)
);

alter table public.reacoes_aviso enable row level security;

drop policy if exists "reacoes_select_publico" on public.reacoes_aviso;
drop policy if exists "reacoes_insert_proprio" on public.reacoes_aviso;
drop policy if exists "reacoes_update_proprio" on public.reacoes_aviso;
drop policy if exists "reacoes_delete_proprio" on public.reacoes_aviso;

create policy "reacoes_select_publico" on public.reacoes_aviso
for select using (true);

create policy "reacoes_insert_proprio" on public.reacoes_aviso
for insert with check (perfil_id = auth.uid());

create policy "reacoes_update_proprio" on public.reacoes_aviso
for update using (perfil_id = auth.uid());

create policy "reacoes_delete_proprio" on public.reacoes_aviso
for delete using (perfil_id = auth.uid());

-- ---------------------------------------------------------------------
-- INDIQUE UM VIZINHO
-- ---------------------------------------------------------------------
alter table public.perfis
  add column if not exists codigo_convite text unique
  default substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8);

alter table public.perfis
  add column if not exists convidado_por uuid references public.perfis(id) on delete set null;

update public.perfis
  set codigo_convite = substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8)
  where codigo_convite is null;

-- resolve o código de convite (se veio no cadastro) pro id de quem convidou
create or replace function public.handle_novo_usuario()
returns trigger as $$
declare
  v_convidado_por uuid;
begin
  if new.raw_user_meta_data->>'codigo_convite' is not null then
    select id into v_convidado_por
    from public.perfis
    where codigo_convite = new.raw_user_meta_data->>'codigo_convite';
  end if;

  insert into public.perfis (id, nome_completo, papel, convidado_por)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', 'Novo usuário'),
    coalesce((new.raw_user_meta_data->>'papel')::public.user_role, 'morador'),
    v_convidado_por
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
