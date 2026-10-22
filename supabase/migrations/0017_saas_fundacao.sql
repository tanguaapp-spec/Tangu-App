-- =====================================================================
-- TANGUÁ APP — MIGRATION 0017: fundação SaaS self-service
-- =====================================================================
-- Roda no SQL Editor do Supabase, DEPOIS da 0016. Idempotente.
--
-- - configuracoes_sistema: chaves globais editáveis pelo painel do dono
-- - registros_auditoria: trilha de ações administrativas/financeiras
-- - planos: preços/limites/recursos configuráveis sem deploy
-- - assinaturas, pagamentos, eventos_webhook: cobrança (Mercado Pago)
-- - limites de plano aplicados por TRIGGER (o front só esconde botões;
--   quem decide é o banco)
-- - autoaprovação de negócio com regras de risco (fim da aprovação manual
--   obrigatória) + perfil "autônomo"
--
-- Escrita em assinaturas/pagamentos/webhooks/auditoria/config/planos: só
-- service role (servidor), nunca pela API pública.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configurações globais
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes_sistema (
  chave text primary key check (chave ~ '^[a-z0-9_]+$'),
  valor jsonb not null,
  descricao text,
  publico boolean not null default false,
  atualizado_por uuid references public.perfis(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.configuracoes_sistema enable row level security;
revoke insert, update, delete on public.configuracoes_sistema from anon, authenticated;
drop policy if exists "config_select" on public.configuracoes_sistema;
create policy "config_select" on public.configuracoes_sistema
for select using (publico or public.eh_admin());

insert into public.configuracoes_sistema (chave, valor, descricao, publico) values
  ('moderacao_previa_negocios', 'false', 'Se ligado, TODO negócio novo espera aprovação manual antes de aparecer.', false),
  ('termos_sinalizados', '[]', 'Lista de palavras que mandam o cadastro de negócio pra revisão manual.', false),
  ('max_cadastros_negocio_por_hora', '30', 'Acima disso (na cidade toda), novos cadastros vão pra revisão — sinal de abuso automatizado.', false),
  ('assinatura_tolerancia_dias', '5', 'Dias que o plano pago continua valendo depois de uma cobrança falhar.', true),
  ('suporte_email', '""', 'E-mail exibido na central de ajuda. Vazio = só formulário.', true),
  ('home_ordem_secoes', '["ofertas","novidades","populares","profissionais","eventos","anuncie"]', 'Ordem das seções da página inicial.', true)
on conflict (chave) do nothing;

create or replace function public.config_valor(p_chave text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select valor from public.configuracoes_sistema where chave = p_chave;
$$;

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create table if not exists public.registros_auditoria (
  id uuid primary key default uuid_generate_v4(),
  ator_id uuid references public.perfis(id) on delete set null,
  acao text not null,
  entidade text,
  entidade_id text,
  dados jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists registros_auditoria_criado_idx on public.registros_auditoria(criado_em desc);
create index if not exists registros_auditoria_entidade_idx on public.registros_auditoria(entidade, entidade_id);

alter table public.registros_auditoria enable row level security;
revoke insert, update, delete on public.registros_auditoria from anon, authenticated;
drop policy if exists "auditoria_select_admin" on public.registros_auditoria;
create policy "auditoria_select_admin" on public.registros_auditoria
for select using (public.eh_admin());

-- concessão de admin agora fica registrada
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
  insert into public.registros_auditoria (acao, entidade, entidade_id, dados)
  values ('admin.conceder', 'perfil', v_id::text, jsonb_build_object('observacao', p_observacao, 'via', current_user));
  return v_id;
end;
$$;
revoke execute on function public.conceder_admin(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------
create table if not exists public.planos (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  nome text not null,
  descricao text,
  preco_centavos int not null check (preco_centavos >= 0),
  moeda text not null default 'BRL',
  ativo boolean not null default true,
  ordem int not null default 0,
  -- valores inteiros >= 0; JSON null = ilimitado
  limites jsonb not null default '{}'::jsonb,
  -- booleanos
  recursos jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

alter table public.planos enable row level security;
revoke insert, update, delete on public.planos from anon, authenticated;
drop policy if exists "planos_select" on public.planos;
create policy "planos_select" on public.planos for select using (ativo or public.eh_admin());

-- Valores iniciais pra validação comercial — editáveis em /painel/admin/planos
insert into public.planos (id, nome, descricao, preco_centavos, ordem, limites, recursos) values
  ('gratuito', 'Gratuito', 'Perfil completo, catálogo e novidades pra começar.', 0, 1,
   '{"max_produtos": 10, "max_cupons_ativos": 1, "max_posts_mes": 4, "max_fotos_galeria": 5}',
   '{"estatisticas_avancadas": false, "destaque_busca": false}'),
  ('profissional', 'Profissional', 'Mais espaço no catálogo, mais ofertas e estatísticas completas.', 3990, 2,
   '{"max_produtos": 60, "max_cupons_ativos": 5, "max_posts_mes": 30, "max_fotos_galeria": 20}',
   '{"estatisticas_avancadas": true, "destaque_busca": false}'),
  ('destaque', 'Destaque', 'Tudo do Profissional + topo da busca da cidade.', 7990, 3,
   '{"max_produtos": null, "max_cupons_ativos": 20, "max_posts_mes": null, "max_fotos_galeria": 40}',
   '{"estatisticas_avancadas": true, "destaque_busca": true}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Assinaturas e pagamentos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.status_assinatura as enum ('pendente', 'ativa', 'em_atraso', 'cancelada', 'expirada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_pagamento as enum ('pendente', 'em_processo', 'aprovado', 'recusado', 'estornado', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.assinaturas (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  plano_id text not null references public.planos(id),
  status public.status_assinatura not null default 'pendente',
  provedor text not null default 'mercadopago',
  provedor_assinatura_id text unique,
  -- preço travado no momento da contratação (mudar o plano não muda quem já assinou)
  valor_centavos int not null check (valor_centavos >= 0),
  periodo_atual_inicio timestamptz,
  periodo_atual_fim timestamptz,
  tolerancia_ate timestamptz,
  cancelar_no_fim_periodo boolean not null default false,
  cancelada_em timestamptz,
  -- data do último evento do provedor aplicado — ignora evento mais velho que chega depois
  ultimo_evento_em timestamptz,
  criado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists assinaturas_uma_aberta_por_negocio
  on public.assinaturas(negocio_id) where status in ('pendente', 'ativa', 'em_atraso');
create index if not exists assinaturas_status_idx on public.assinaturas(status);

alter table public.assinaturas enable row level security;
revoke insert, update, delete on public.assinaturas from anon, authenticated;
drop policy if exists "assinaturas_select_dono_ou_admin" on public.assinaturas;
create policy "assinaturas_select_dono_ou_admin" on public.assinaturas
for select using (public.eh_dono_negocio(negocio_id) or public.eh_admin());

create table if not exists public.pagamentos (
  id uuid primary key default uuid_generate_v4(),
  assinatura_id uuid references public.assinaturas(id) on delete set null,
  negocio_id uuid references public.negocios(id) on delete set null,
  provedor text not null default 'mercadopago',
  provedor_pagamento_id text not null,
  status public.status_pagamento not null default 'pendente',
  valor_centavos int not null check (valor_centavos >= 0),
  moeda text not null default 'BRL',
  pago_em timestamptz,
  -- só status_detail do provedor: nada de dados de cartão
  detalhe_status text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (provedor, provedor_pagamento_id)
);

create index if not exists pagamentos_negocio_idx on public.pagamentos(negocio_id, criado_em desc);
create index if not exists pagamentos_status_idx on public.pagamentos(status, criado_em desc);

alter table public.pagamentos enable row level security;
revoke insert, update, delete on public.pagamentos from anon, authenticated;
drop policy if exists "pagamentos_select_dono_ou_admin" on public.pagamentos;
create policy "pagamentos_select_dono_ou_admin" on public.pagamentos
for select using ((negocio_id is not null and public.eh_dono_negocio(negocio_id)) or public.eh_admin());

create table if not exists public.eventos_webhook (
  id uuid primary key default uuid_generate_v4(),
  provedor text not null,
  chave_idempotencia text not null,
  tipo text,
  recurso_id text,
  assinatura_valida boolean not null default false,
  status text not null default 'recebido' check (status in ('recebido', 'processado', 'ignorado', 'falhou')),
  tentativas int not null default 0,
  erro text,
  payload jsonb,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  unique (provedor, chave_idempotencia)
);

create index if not exists eventos_webhook_status_idx on public.eventos_webhook(status, recebido_em desc);

alter table public.eventos_webhook enable row level security;
revoke insert, update, delete on public.eventos_webhook from anon, authenticated;
drop policy if exists "eventos_webhook_select_admin" on public.eventos_webhook;
create policy "eventos_webhook_select_admin" on public.eventos_webhook for select using (public.eh_admin());

-- ---------------------------------------------------------------------
-- Plano efetivo e limites (fonte da verdade de "o que esse negócio pode")
-- ---------------------------------------------------------------------
-- Calculado a partir de datas, não só do status: mesmo que o cron atrase,
-- um plano vencido deixa de valer na hora certa.
create or replace function public.plano_efetivo(p_negocio_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select a.plano_id
       from public.assinaturas a
       join public.planos p on p.id = a.plano_id
      where a.negocio_id = p_negocio_id
        and (
          (a.status = 'ativa' and (a.periodo_atual_fim is null or a.periodo_atual_fim > now()
                                   or (a.tolerancia_ate is not null and a.tolerancia_ate > now())))
          or (a.status = 'em_atraso' and a.tolerancia_ate > now())
          or (a.status = 'cancelada' and a.periodo_atual_fim > now())
        )
      order by p.preco_centavos desc, a.criado_em desc
      limit 1),
    'gratuito'
  );
$$;

-- null = ilimitado. Chave ausente no plano → herda do gratuito.
create or replace function public.limite_plano(p_negocio_id uuid, p_chave text)
returns int
language plpgsql stable security definer set search_path = public
as $$
declare
  v_limites jsonb;
begin
  select limites into v_limites from public.planos where id = public.plano_efetivo(p_negocio_id);
  if v_limites is null or not (v_limites ? p_chave) then
    select limites into v_limites from public.planos where id = 'gratuito';
  end if;
  if v_limites is null or not (v_limites ? p_chave) or jsonb_typeof(v_limites -> p_chave) = 'null' then
    return null;
  end if;
  return (v_limites ->> p_chave)::int;
end;
$$;

create or replace function public.recurso_plano(p_negocio_id uuid, p_chave text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((recursos ->> p_chave)::boolean, false)
  from public.planos where id = public.plano_efetivo(p_negocio_id);
$$;

create or replace function public.contar_uso_plano(p_negocio_id uuid, p_chave text)
returns int
language sql stable security definer set search_path = public
as $$
  select case p_chave
    when 'max_produtos' then
      (select count(*)::int from public.produtos_servicos where negocio_id = p_negocio_id and ativo)
    when 'max_cupons_ativos' then
      (select count(*)::int from public.cupons where negocio_id = p_negocio_id and ativo and expira_em > now())
    when 'max_posts_mes' then
      (select count(*)::int from public.posts_negocio
        where negocio_id = p_negocio_id and criado_em >= date_trunc('month', now()))
    when 'max_fotos_galeria' then
      (select coalesce(jsonb_array_length(galeria), 0) from public.negocios where id = p_negocio_id)
    else 0
  end;
$$;

-- Resumo pro painel do dono: plano, limites e consumo atual.
create or replace function public.uso_plano(p_negocio_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_plano text;
  v_resultado jsonb := '{}'::jsonb;
  v_chave text;
begin
  if not (public.eh_dono_negocio(p_negocio_id) or public.eh_admin()) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v_plano := public.plano_efetivo(p_negocio_id);
  foreach v_chave in array array['max_produtos', 'max_cupons_ativos', 'max_posts_mes', 'max_fotos_galeria'] loop
    v_resultado := v_resultado || jsonb_build_object(
      v_chave,
      jsonb_build_object('limite', public.limite_plano(p_negocio_id, v_chave), 'uso', public.contar_uso_plano(p_negocio_id, v_chave))
    );
  end loop;
  return jsonb_build_object(
    'plano', v_plano,
    'recursos', (select recursos from public.planos where id = v_plano),
    'limites', v_resultado
  );
end;
$$;
revoke execute on function public.uso_plano(uuid) from public, anon;
grant execute on function public.uso_plano(uuid) to authenticated;

-- Trigger genérico: TG_ARGV[0] = chave do limite.
-- Erro sempre começa com "LIMITE_PLANO:<chave>" — o app traduz em mensagem amigável.
create or replace function public.aplicar_limite_plano()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_chave text := tg_argv[0];
  v_negocio uuid;
  v_limite int;
  v_uso int;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  if tg_table_name = 'negocios' then
    v_negocio := new.id;
    -- galeria: só barra quando cresce
    if tg_op = 'UPDATE' and coalesce(jsonb_array_length(new.galeria), 0) <= coalesce(jsonb_array_length(old.galeria), 0) then
      return new;
    end if;
    v_uso := coalesce(jsonb_array_length(new.galeria), 0) - 1;
  else
    v_negocio := new.negocio_id;
    -- update só conta quando reativa um item (ativo false → true)
    if tg_op = 'UPDATE' and not (coalesce(new.ativo, false) and not coalesce(old.ativo, false)) then
      return new;
    end if;
    v_uso := public.contar_uso_plano(v_negocio, v_chave);
  end if;

  v_limite := public.limite_plano(v_negocio, v_chave);
  if v_limite is not null and v_uso >= v_limite then
    raise exception 'LIMITE_PLANO:%', v_chave
      using errcode = 'P0001', hint = format('Limite do plano atual: %s', v_limite);
  end if;
  return new;
end;
$$;

do $$ begin
  drop trigger if exists produtos_limite_plano on public.produtos_servicos;
  create trigger produtos_limite_plano before insert or update of ativo on public.produtos_servicos
    for each row execute function public.aplicar_limite_plano('max_produtos');

  drop trigger if exists cupons_limite_plano on public.cupons;
  create trigger cupons_limite_plano before insert or update of ativo on public.cupons
    for each row execute function public.aplicar_limite_plano('max_cupons_ativos');

  drop trigger if exists posts_limite_plano on public.posts_negocio;
  create trigger posts_limite_plano before insert on public.posts_negocio
    for each row execute function public.aplicar_limite_plano('max_posts_mes');

  drop trigger if exists negocios_galeria_limite_plano on public.negocios;
  create trigger negocios_galeria_limite_plano before update of galeria on public.negocios
    for each row execute function public.aplicar_limite_plano('max_fotos_galeria');
end $$;

-- ---------------------------------------------------------------------
-- Negócio: perfil autônomo + autoaprovação com regras de risco
-- ---------------------------------------------------------------------
alter table public.negocios
  add column if not exists tipo_perfil text not null default 'estabelecimento'
    check (tipo_perfil in ('estabelecimento', 'autonomo'));
alter table public.negocios add column if not exists area_atendimento text;
alter table public.negocios add column if not exists motivo_moderacao text;

comment on column public.negocios.tipo_perfil is
  'estabelecimento = ponto comercial; autonomo = profissional sem loja (endereço residencial nunca é pedido nem exibido).';
comment on column public.negocios.motivo_moderacao is
  'Por que um cadastro caiu na revisão manual (regra automática que disparou). Interno.';

create or replace function public.negocios_status_inicial()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_termos jsonb := coalesce(public.config_valor('termos_sinalizados'), '[]'::jsonb);
  v_termo text;
  v_max_hora int := coalesce((public.config_valor('max_cadastros_negocio_por_hora') #>> '{}')::int, 30);
  v_texto text := lower(coalesce(new.nome, '') || ' ' || coalesce(new.descricao, ''));
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  -- um autocadastro por conta (a action já checa; aqui vale também pra API direta)
  if exists (select 1 from public.negocios where reivindicado_por = auth.uid()) then
    raise exception 'NEGOCIO_DUPLICADO' using errcode = 'P0001',
      hint = 'Esta conta já tem um negócio. Para outro negócio, use outra conta ou fale com o suporte.';
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

do $$ begin
  drop trigger if exists negocios_status_inicial_trigger on public.negocios;
  create trigger negocios_status_inicial_trigger before insert on public.negocios
    for each row execute function public.negocios_status_inicial();
end $$;

-- quem cadastra negócio vira profissional (sem depender do app fazer isso)
create or replace function public.negocios_promove_dono()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.reivindicado_por is not null then
    update public.perfis set papel = 'profissional' where id = new.reivindicado_por and papel = 'morador';
  end if;
  return new;
end;
$$;

do $$ begin
  drop trigger if exists negocios_promove_dono_trigger on public.negocios;
  create trigger negocios_promove_dono_trigger after insert on public.negocios
    for each row execute function public.negocios_promove_dono();
end $$;

-- Policy de insert: status é decidido pelo trigger acima (o check roda
-- depois dos triggers BEFORE). Morador também pode cadastrar — antes a
-- policy exigia papel profissional e o fluxo "morador abre negócio" falhava.
drop policy if exists "negocios_insert_proprio" on public.negocios;
create policy "negocios_insert_proprio" on public.negocios
for insert
with check (
  reivindicado_por = auth.uid()
  and origem = 'cadastro_manual'
  and status_cadastro in ('pendente', 'aprovado')
  and verificado = false
  and destaque_ativo = false
  and destaque_expira_em is null
  and google_place_id is null
  and nota_google is null
  and total_avaliacoes_google is null
);

-- motivo_moderacao também é campo administrativo
create or replace function public.negocios_protege_campos_admin()
returns trigger as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    new.verificado := old.verificado;
    new.destaque_ativo := old.destaque_ativo;
    new.destaque_expira_em := old.destaque_expira_em;
    if old.status_cadastro = 'rejeitado' and new.status_cadastro = 'pendente' then
      new.motivo_rejeicao := null;
      new.motivo_moderacao := 'Reenviado após recusa.';
    else
      new.status_cadastro := old.status_cadastro;
      new.motivo_rejeicao := old.motivo_rejeicao;
      new.motivo_moderacao := old.motivo_moderacao;
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

-- ---------------------------------------------------------------------
-- Morador: interesses e onboarding
-- ---------------------------------------------------------------------
alter table public.perfis add column if not exists categorias_interesse uuid[] not null default '{}';
alter table public.perfis add column if not exists onboarding_concluido_em timestamptz;
grant update (categorias_interesse, onboarding_concluido_em) on public.perfis to authenticated;
