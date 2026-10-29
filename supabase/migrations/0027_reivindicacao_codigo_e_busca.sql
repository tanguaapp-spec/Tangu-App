-- =====================================================================
-- 0027 — Ordem da busca, reivindicação por código e avisos por interesse
-- =====================================================================
-- Só acrescenta. Pode rodar já e mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ordem da busca: perfil com dono e foto aparece antes
-- ---------------------------------------------------------------------
-- 0 = sem dono e sem foto · 1 = só foto · 2 = só dono · 3 = dono e foto
alter table public.negocios add column if not exists completude smallint
  generated always as ((case when reivindicado_por is not null then 2 else 0 end)
                     + (case when foto_capa_url is not null and foto_capa_url <> '' then 1 else 0 end)) stored;
create index if not exists negocios_busca_completude_idx on public.negocios(destaque_ativo desc, completude desc);

-- ---------------------------------------------------------------------
-- 2. Reivindicação por código no WhatsApp do próprio comércio
-- ---------------------------------------------------------------------
-- O dono pede; o time manda o código (1 toque) pro WhatsApp que JÁ está no
-- cadastro; o dono digita e assume na hora. Prova que tem o número.
create table if not exists public.codigos_reivindicacao (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  -- só o hash: quem lê a tabela não vê o código
  codigo_hash text not null,
  -- mensagem pronta pro time enviar (com o código), apagada quando usada/vencida
  mensagem text,
  telefone text not null,
  status text not null default 'aguardando_envio' check (status in ('aguardando_envio', 'enviado', 'usado', 'vencido', 'cancelado')),
  tentativas int not null default 0,
  enviado_por uuid references public.perfis(id) on delete set null,
  enviado_em timestamptz,
  expira_em timestamptz not null default now() + interval '48 hours',
  criado_em timestamptz not null default now()
);
create index if not exists codigos_reivindicacao_status_idx on public.codigos_reivindicacao(status, criado_em);
create unique index if not exists codigos_reivindicacao_aberto_idx on public.codigos_reivindicacao(negocio_id, perfil_id)
  where status in ('aguardando_envio', 'enviado');
alter table public.codigos_reivindicacao enable row level security;
revoke insert, update, delete on public.codigos_reivindicacao from anon, authenticated;
drop policy if exists "codigos_reivindicacao_admin" on public.codigos_reivindicacao;
create policy "codigos_reivindicacao_admin" on public.codigos_reivindicacao for select using (public.eh_admin());

-- ---------------------------------------------------------------------
-- 3. Avisos por interesse: quem marcou a categoria recebe as ofertas dela
-- ---------------------------------------------------------------------
create index if not exists perfis_categorias_interesse_idx on public.perfis using gin (categorias_interesse);

-- ---------------------------------------------------------------------
-- 4. Logs do admin mais detalhados
-- ---------------------------------------------------------------------
-- origem: tela, navegador, promessa, acao_sem_resposta, servidor, pagamento, cron…
-- detalhes: navegador, sistema, tela, ambiente (produção/preview), versão do app, etc.
alter table public.error_logs add column if not exists origem text;
alter table public.error_logs add column if not exists detalhes jsonb not null default '{}'::jsonb;
create index if not exists error_logs_origem_idx on public.error_logs(origem, criado_em desc);
