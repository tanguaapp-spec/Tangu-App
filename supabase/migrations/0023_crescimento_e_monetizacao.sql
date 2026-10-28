-- =====================================================================
-- 0023 — Vários negócios por dono, divulgação paga (self-service),
-- métricas de crescimento, leads, conteúdo da cidade e horários especiais
-- =====================================================================
-- Só ACRESCENTA: tabelas novas, colunas novas com default e funções
-- recriadas com o mesmo nome. Nada é apagado nem renomeado, então o app
-- que já está em produção continua funcionando com o banco migrado.
-- Pode rodar mais de uma vez (if not exists / on conflict / or replace).
-- Planos novos (Essencial/Destaque/Premium) ficam na 0024, separada de
-- propósito: ela muda preço visível em produção.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Configurações novas (editáveis em Admin → Configurações)
-- ---------------------------------------------------------------------
insert into public.configuracoes_sistema (chave, valor, descricao, publico) values
  ('max_negocios_por_dono', '5', 'Quantos negócios uma mesma conta pode cadastrar e administrar.', false),
  ('whatsapp_comercial', '""', 'WhatsApp do time do Tanguá App (só números com DDD) que recebe quem comprou divulgação.', true),
  ('modulos_ativos', '{"agenda_whatsapp": true, "pedidos_whatsapp": true, "noticias": true, "servicos_uteis": true, "mapa": true, "mural": true, "vagas": true, "orcamentos": true, "nps": true}', 'Liga e desliga partes inteiras do app.', true),
  ('max_push_opcional_dia', '3', 'Máximo de notificações opcionais (ofertas, novidades) por pessoa por dia. Avisos essenciais não contam.', false),
  ('fontes_noticias', '[]', 'Endereços RSS lidos uma vez por dia (ex.: site da Prefeitura). As notícias entram como rascunho para revisão.', false),
  ('link_beloo', '"https://beloo-xzdr.vercel.app"', 'Endereço da Beloo (agenda completa) sugerido aos profissionais.', true),
  ('link_fregues', '"https://card-pio-digital-hazel.vercel.app"', 'Endereço do Freguês (cardápio e pedidos completos) sugerido aos comércios.', true)
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- 2. Vários negócios por dono
-- ---------------------------------------------------------------------
-- O limite deixa de ser "1 por conta" e passa a ser a configuração acima.
create or replace function public.negocios_status_inicial()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_termos jsonb := coalesce(public.config_valor('termos_sinalizados'), '[]'::jsonb);
  v_termo text;
  v_max_hora int := coalesce((public.config_valor('max_cadastros_negocio_por_hora') #>> '{}')::int, 30);
  v_max_dono int := coalesce((public.config_valor('max_negocios_por_dono') #>> '{}')::int, 5);
  v_texto text := lower(coalesce(new.nome, '') || ' ' || coalesce(new.descricao, ''));
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  if (select count(*) from public.negocios where reivindicado_por = auth.uid()) >= v_max_dono then
    raise exception 'NEGOCIO_DUPLICADO' using errcode = 'P0001',
      hint = 'Esta conta já chegou ao limite de negócios. Fale com o suporte para cadastrar mais.';
  end if;

  new.status_cadastro := 'aprovado';
  new.motivo_moderacao := null;

  if coalesce((public.config_valor('moderacao_previa_negocios') #>> '{}')::boolean, false) then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := 'Moderação prévia ligada nas configurações.';
  elsif exists (select 1 from public.negocios where reivindicado_por = auth.uid() and status_cadastro = 'rejeitado') then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := 'Conta já teve cadastro recusado.';
  elsif (select count(*) from public.negocios
          where origem = 'cadastro_manual' and criado_em > now() - interval '1 hour') >= v_max_hora then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := 'Volume de cadastros fora do normal na última hora.';
  else
    for v_termo in select jsonb_array_elements_text(v_termos) loop
      if v_termo <> '' and position(lower(v_termo) in v_texto) > 0 then
        new.status_cadastro := 'pendente';
        new.motivo_moderacao := format('Termo sinalizado: "%s".', v_termo);
        exit;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Negócio: pedidos e agenda pelo WhatsApp, importação, horários especiais
-- ---------------------------------------------------------------------
alter table public.negocios add column if not exists pedidos_whatsapp boolean not null default false;
alter table public.negocios add column if not exists agenda_whatsapp boolean not null default false;
-- {"entrega": true, "retirada": true, "taxa_entrega_centavos": 500, "pedido_minimo_centavos": 0, "observacao": "..."}
alter table public.negocios add column if not exists config_pedidos jsonb not null default '{}'::jsonb;
-- identificador da linha na lista importada: reimportar atualiza em vez de duplicar
alter table public.negocios add column if not exists import_ref text;
create unique index if not exists negocios_import_ref_idx on public.negocios(import_ref) where import_ref is not null;
alter table public.negocios add column if not exists pausado_em timestamptz;

alter table public.produtos_servicos add column if not exists duracao_min int check (duracao_min is null or duracao_min between 5 and 600);

create table if not exists public.horarios_especiais (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  data date not null,
  fechado boolean not null default true,
  abre time,
  fecha time,
  motivo text check (motivo is null or char_length(motivo) <= 80),
  criado_em timestamptz not null default now(),
  unique (negocio_id, data),
  check (fechado or (abre is not null and fecha is not null))
);
alter table public.horarios_especiais enable row level security;
drop policy if exists "horarios_especiais_select" on public.horarios_especiais;
create policy "horarios_especiais_select" on public.horarios_especiais for select using (true);
drop policy if exists "horarios_especiais_dono" on public.horarios_especiais;
create policy "horarios_especiais_dono" on public.horarios_especiais for all
  using (public.eh_dono_negocio(negocio_id) or public.eh_admin())
  with check (public.eh_dono_negocio(negocio_id) or public.eh_admin());

-- pedido do proprietário para ocultar um perfil criado pela plataforma
create table if not exists public.pedidos_ocultar (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 100),
  contato text not null check (char_length(contato) between 5 and 120),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  status text not null default 'aberto' check (status in ('aberto', 'ocultado', 'recusado')),
  resolvido_por uuid references public.perfis(id) on delete set null,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists pedidos_ocultar_status_idx on public.pedidos_ocultar(status, criado_em desc);
alter table public.pedidos_ocultar enable row level security;
revoke insert, update, delete on public.pedidos_ocultar from anon, authenticated;
drop policy if exists "pedidos_ocultar_admin" on public.pedidos_ocultar;
create policy "pedidos_ocultar_admin" on public.pedidos_ocultar for select using (public.eh_admin());

-- ---------------------------------------------------------------------
-- 4. Conteúdo da cidade: serviços úteis, notícias, eventos sugeridos
-- ---------------------------------------------------------------------
create table if not exists public.servicos_uteis (
  id uuid primary key default uuid_generate_v4(),
  categoria text not null check (categoria in ('emergencia', 'saude', 'farmacia_plantao', 'prefeitura', 'transporte', 'coleta', 'outros')),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text,
  whatsapp text,
  endereco text,
  horario text,
  observacao text check (observacao is null or char_length(observacao) <= 300),
  -- farmácia de plantão: período em que está de plantão
  plantao_inicio date,
  plantao_fim date,
  ordem int not null default 0,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
alter table public.servicos_uteis enable row level security;
revoke insert, update, delete on public.servicos_uteis from anon, authenticated;
drop policy if exists "servicos_uteis_select" on public.servicos_uteis;
create policy "servicos_uteis_select" on public.servicos_uteis for select using (ativo or public.eh_admin());

insert into public.servicos_uteis (categoria, nome, telefone, observacao, ordem)
select * from (values
  ('emergencia', 'SAMU', '192', 'Emergências médicas, 24 horas', 1),
  ('emergencia', 'Corpo de Bombeiros', '193', 'Incêndio, resgate e salvamento, 24 horas', 2),
  ('emergencia', 'Polícia Militar', '190', 'Emergência policial, 24 horas', 3),
  ('emergencia', 'Defesa Civil', '199', 'Enchentes, deslizamentos e riscos', 4),
  ('emergencia', 'Disque Denúncia', '(21) 2253-1177', 'Anônimo', 5)
) as v(categoria, nome, telefone, observacao, ordem)
where not exists (select 1 from public.servicos_uteis);

create table if not exists public.noticias (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null check (char_length(titulo) between 5 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  resumo text check (resumo is null or char_length(resumo) <= 300),
  corpo text not null default '',
  imagem_url text,
  fonte_nome text,
  fonte_url text,
  -- sugerida (morador mandou) → rascunho → publicada | arquivada
  status text not null default 'rascunho' check (status in ('sugerida', 'rascunho', 'publicada', 'arquivada')),
  patrocinada boolean not null default false,
  destaque boolean not null default false,
  sugerida_por uuid references public.perfis(id) on delete set null,
  contato_sugestao text,
  id_externo text unique,
  publicada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists noticias_publicadas_idx on public.noticias(status, publicada_em desc);
alter table public.noticias enable row level security;
revoke insert, update, delete on public.noticias from anon, authenticated;
drop policy if exists "noticias_select" on public.noticias;
create policy "noticias_select" on public.noticias for select using (status = 'publicada' or public.eh_admin());

create table if not exists public.sugestoes_evento (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid references public.perfis(id) on delete set null,
  titulo text not null check (char_length(titulo) between 5 and 140),
  descricao text not null check (char_length(descricao) between 10 and 2000),
  local_evento text not null check (char_length(local_evento) between 3 and 160),
  data_evento timestamptz not null,
  contato text check (contato is null or char_length(contato) <= 120),
  status text not null default 'aberta' check (status in ('aberta', 'aprovada', 'recusada')),
  aviso_id uuid references public.avisos_cidade(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.sugestoes_evento enable row level security;
revoke insert, update, delete on public.sugestoes_evento from anon, authenticated;
drop policy if exists "sugestoes_evento_select" on public.sugestoes_evento;
create policy "sugestoes_evento_select" on public.sugestoes_evento for select using (perfil_id = auth.uid() or public.eh_admin());

-- ---------------------------------------------------------------------
-- 5. Divulgação paga (catálogo configurável + compras pelo Mercado Pago)
-- ---------------------------------------------------------------------
create table if not exists public.servicos_pagos (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  nome text not null,
  descricao text not null default '',
  -- onde aparece: banner_home, banner_categoria, banner_ofertas, destaque_busca, push, instagram, outro
  posicao text not null,
  -- [{"dias": 7, "preco_centavos": 2990}, ...]; dias 0 = entrega única (post, notificação)
  opcoes jsonb not null default '[]'::jsonb,
  -- precisa de arte combinada no WhatsApp antes de ir ao ar
  requer_arte boolean not null default true,
  ativo boolean not null default false,
  ordem int not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.servicos_pagos enable row level security;
revoke insert, update, delete on public.servicos_pagos from anon, authenticated;
drop policy if exists "servicos_pagos_select" on public.servicos_pagos;
create policy "servicos_pagos_select" on public.servicos_pagos for select using (ativo or public.eh_admin());

-- todos desligados: o admin escolhe o que vender e por quanto
insert into public.servicos_pagos (id, nome, descricao, posicao, opcoes, requer_arte, ordem) values
  ('banner_home', 'Banner na página inicial', 'Seu banner no topo da página inicial, visto por todo mundo que abre o app.', 'banner_home',
    '[{"dias": 7, "preco_centavos": 4990}, {"dias": 15, "preco_centavos": 8990}, {"dias": 30, "preco_centavos": 14990}]', true, 1),
  ('banner_categoria', 'Banner na sua categoria', 'Seu banner no topo da lista da sua categoria (ex.: Alimentação).', 'banner_categoria',
    '[{"dias": 7, "preco_centavos": 2990}, {"dias": 15, "preco_centavos": 4990}, {"dias": 30, "preco_centavos": 8990}]', true, 2),
  ('banner_ofertas', 'Banner na página de ofertas', 'Banner no topo das ofertas, onde está quem quer comprar.', 'banner_ofertas',
    '[{"dias": 7, "preco_centavos": 3990}, {"dias": 15, "preco_centavos": 6990}, {"dias": 30, "preco_centavos": 11990}]', true, 3),
  ('destaque_busca', 'Destaque no topo da busca', 'Seu negócio aparece primeiro na busca e na página inicial. Entra no ar assim que o pagamento é aprovado.', 'destaque_busca',
    '[{"dias": 7, "preco_centavos": 1990}, {"dias": 15, "preco_centavos": 3490}, {"dias": 30, "preco_centavos": 5990}]', false, 4),
  ('notificacao_patrocinada', 'Notificação para a cidade', 'Uma notificação no celular de todo mundo que ativou os avisos do Tanguá App.', 'push',
    '[{"dias": 0, "preco_centavos": 9990}]', true, 5),
  ('post_instagram', 'Post no Instagram do Tanguá App', 'Um post no feed do nosso Instagram com a sua arte.', 'instagram',
    '[{"dias": 0, "preco_centavos": 4990}]', true, 6),
  ('stories_instagram', 'Stories no Instagram do Tanguá App', 'Sequência de stories com link pro seu perfil no app.', 'instagram',
    '[{"dias": 0, "preco_centavos": 2990}]', true, 7),
  ('evento_patrocinado', 'Evento em destaque na agenda', 'Seu evento fixado no topo da agenda da cidade.', 'evento',
    '[{"dias": 7, "preco_centavos": 2990}, {"dias": 15, "preco_centavos": 4990}]', true, 8),
  ('vaga_destaque', 'Vaga em destaque', 'Sua vaga de emprego fixada no topo da lista de vagas.', 'vaga',
    '[{"dias": 7, "preco_centavos": 1990}, {"dias": 15, "preco_centavos": 2990}]', true, 9)
on conflict (id) do nothing;

create table if not exists public.compras_servicos (
  id uuid primary key default uuid_generate_v4(),
  servico_id text not null references public.servicos_pagos(id),
  negocio_id uuid references public.negocios(id) on delete set null,
  perfil_id uuid references public.perfis(id) on delete set null,
  -- cópia do que foi comprado: mudar o catálogo não muda compra feita
  nome_servico text not null,
  dias int not null check (dias >= 0),
  valor_centavos int not null check (valor_centavos >= 0),
  -- aguardando_pagamento → pago → no_ar → encerrada | cancelada | recusada | estornada
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'no_ar', 'encerrada', 'cancelada', 'recusada', 'estornada')),
  provedor_preferencia_id text,
  provedor_pagamento_id text unique,
  pago_em timestamptz,
  inicia_em timestamptz,
  termina_em timestamptz,
  -- arte e destino definidos com o time pelo WhatsApp
  arte_url text,
  link_destino text,
  categoria_id uuid references public.categorias(id) on delete set null,
  nota_interna text,
  impressoes int not null default 0,
  cliques int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists compras_servicos_status_idx on public.compras_servicos(status, criado_em desc);
create index if not exists compras_servicos_negocio_idx on public.compras_servicos(negocio_id, criado_em desc);
create index if not exists compras_servicos_no_ar_idx on public.compras_servicos(servico_id, status, inicia_em, termina_em);
alter table public.compras_servicos enable row level security;
revoke insert, update, delete on public.compras_servicos from anon, authenticated;
drop policy if exists "compras_servicos_select" on public.compras_servicos;
create policy "compras_servicos_select" on public.compras_servicos for select
  using (perfil_id = auth.uid() or (negocio_id is not null and public.eh_dono_negocio(negocio_id)) or public.eh_admin());

-- banners no ar (leitura pública só do necessário pra exibir)
create or replace function public.banners_no_ar(p_posicao text, p_categoria_id uuid default null)
returns table (id uuid, arte_url text, link_destino text, nome_negocio text, slug text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.arte_url, c.link_destino, n.nome, n.slug
    from public.compras_servicos c
    join public.servicos_pagos s on s.id = c.servico_id
    left join public.negocios n on n.id = c.negocio_id
   where s.posicao = p_posicao
     and c.status = 'no_ar'
     and c.arte_url is not null
     and (c.inicia_em is null or c.inicia_em <= now())
     and (c.termina_em is null or c.termina_em > now())
     and (p_posicao <> 'banner_categoria' or c.categoria_id = p_categoria_id)
   order by random()
   limit 3;
$$;
grant execute on function public.banners_no_ar(text, uuid) to anon, authenticated;

-- contagem de impressão/clique sem expor a tabela
create or replace function public.contar_banner(p_compra_id uuid, p_tipo text)
returns void
language sql volatile security definer set search_path = public
as $$
  update public.compras_servicos
     set impressoes = impressoes + case when p_tipo = 'impressao' then 1 else 0 end,
         cliques = cliques + case when p_tipo = 'clique' then 1 else 0 end
   where id = p_compra_id and status = 'no_ar';
$$;
grant execute on function public.contar_banner(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Métricas de crescimento: atividade diária, NPS, CSAT, investimento
-- ---------------------------------------------------------------------
-- uma linha por visitante por dia (id anônimo do aparelho, com hash) — base de DAU/WAU/MAU e retenção
create table if not exists public.atividade_diaria (
  dia date not null,
  visitante text not null check (char_length(visitante) between 8 and 80),
  perfil_id uuid references public.perfis(id) on delete set null,
  instalado boolean not null default false,
  primeira_pagina text,
  origem text,
  primary key (dia, visitante)
);
create index if not exists atividade_diaria_visitante_idx on public.atividade_diaria(visitante, dia);
alter table public.atividade_diaria enable row level security;
revoke insert, update, delete on public.atividade_diaria from anon, authenticated;
drop policy if exists "atividade_admin" on public.atividade_diaria;
create policy "atividade_admin" on public.atividade_diaria for select using (public.eh_admin());

create table if not exists public.respostas_nps (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid references public.perfis(id) on delete set null,
  visitante text,
  publico text not null default 'morador' check (publico in ('morador', 'negocio')),
  nota int not null check (nota between 0 and 10),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  criado_em timestamptz not null default now()
);
create index if not exists respostas_nps_data_idx on public.respostas_nps(criado_em desc);
alter table public.respostas_nps enable row level security;
revoke insert, update, delete on public.respostas_nps from anon, authenticated;
drop policy if exists "nps_admin" on public.respostas_nps;
create policy "nps_admin" on public.respostas_nps for select using (public.eh_admin());

-- satisfação com o atendimento do suporte (1 a 5), dada ao fechar o chamado
alter table public.chamados_suporte add column if not exists avaliacao int check (avaliacao is null or avaliacao between 1 and 5);

create table if not exists public.investimentos_marketing (
  id uuid primary key default uuid_generate_v4(),
  mes date not null,
  canal text not null check (char_length(canal) between 2 and 60),
  valor_centavos int not null check (valor_centavos >= 0),
  observacao text,
  criado_em timestamptz not null default now()
);
alter table public.investimentos_marketing enable row level security;
revoke insert, update, delete on public.investimentos_marketing from anon, authenticated;
drop policy if exists "investimentos_admin" on public.investimentos_marketing;
create policy "investimentos_admin" on public.investimentos_marketing for select using (public.eh_admin());

-- ---------------------------------------------------------------------
-- 7. Leads (acompanhamento comercial)
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid unique references public.negocios(id) on delete cascade,
  nome text not null,
  telefone text,
  -- de onde veio: nao_reivindicado, gratuito, checkout_abandonado, teste_acabando, inativo, manual
  origem text not null default 'manual',
  etapa text not null default 'novo' check (etapa in ('novo', 'contatado', 'interessado', 'negociando', 'cliente', 'perdido')),
  responsavel_id uuid references public.perfis(id) on delete set null,
  proximo_contato_em date,
  motivo_perda text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists leads_etapa_idx on public.leads(etapa, proximo_contato_em);

create table if not exists public.interacoes_lead (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  autor_id uuid references public.perfis(id) on delete set null,
  tipo text not null default 'nota' check (tipo in ('nota', 'whatsapp', 'ligacao', 'visita', 'etapa')),
  texto text not null check (char_length(texto) between 1 and 2000),
  criado_em timestamptz not null default now()
);
create index if not exists interacoes_lead_idx on public.interacoes_lead(lead_id, criado_em desc);

alter table public.leads enable row level security;
alter table public.interacoes_lead enable row level security;
revoke insert, update, delete on public.leads, public.interacoes_lead from anon, authenticated;
drop policy if exists "leads_admin" on public.leads;
create policy "leads_admin" on public.leads for select using (public.eh_admin());
drop policy if exists "interacoes_lead_admin" on public.interacoes_lead;
create policy "interacoes_lead_admin" on public.interacoes_lead for select using (public.eh_admin());

-- ---------------------------------------------------------------------
-- 8. Limite diário de notificações opcionais (ofertas, novidades…)
-- ---------------------------------------------------------------------
alter table public.notificacoes add column if not exists opcional boolean not null default false;
create index if not exists notificacoes_opcional_dia_idx on public.notificacoes(perfil_id, criado_em desc) where opcional;
