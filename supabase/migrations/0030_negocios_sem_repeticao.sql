-- =====================================================================
-- 0030 — Negócio repetido não entra
-- =====================================================================
-- Só acrescenta (função, índice e a regra de cadastro). Não apaga nem
-- muda nenhum negócio que já existe. Pode rodar mais de uma vez.
--
-- Causa dos repetidos: com vários negócios por conta (0023), a mesma
-- pessoa conseguia cadastrar o mesmo negócio de novo, por exemplo ao
-- tocar outra vez em "Cadastrar" quando a internet demorou.
-- =====================================================================

-- "Máx Gym Academia." e "max gym  academia" viram "max gym academia"
-- (mesma regra de chaveNome em lib/negocios/duplicados.ts)
create or replace function public.normalizar_nome(p text)
returns text
language sql immutable parallel safe
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p, '')),
      'áàâãäåéèêëíìîïóòôõöúùûüçñý',
      'aaaaaaeeeeiiiiooooouuuucny'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create index if not exists negocios_nome_normalizado_idx on public.negocios (public.normalizar_nome(nome));

-- Regra de cadastro (antes: 0023) + duas checagens novas:
--  1. a mesma conta não cadastra outro negócio com o mesmo nome;
--  2. nome igual ao de um negócio de OUTRA pessoa entra para revisão
--     (pode ser repetido; pode ser filial — o time decide).
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
  v_chave text := public.normalizar_nome(new.nome);
  v_parecido text;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  if (select count(*) from public.negocios where reivindicado_por = auth.uid()) >= v_max_dono then
    raise exception 'NEGOCIO_DUPLICADO' using errcode = 'P0001',
      hint = 'Esta conta já chegou ao limite de negócios. Fale com o suporte para cadastrar mais.';
  end if;

  if v_chave <> '' and exists (
    select 1 from public.negocios
     where reivindicado_por = auth.uid() and public.normalizar_nome(nome) = v_chave
  ) then
    raise exception 'NEGOCIO_REPETIDO' using errcode = 'P0001',
      hint = 'Esta conta já tem um negócio com esse nome.';
  end if;

  new.status_cadastro := 'aprovado';
  new.motivo_moderacao := null;

  select n.nome into v_parecido
    from public.negocios n
   where v_chave <> '' and public.normalizar_nome(n.nome) = v_chave and n.status_cadastro <> 'rejeitado'
   limit 1;

  if coalesce((public.config_valor('moderacao_previa_negocios') #>> '{}')::boolean, false) then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := 'Moderação prévia ligada nas configurações.';
  elsif exists (select 1 from public.negocios where reivindicado_por = auth.uid() and status_cadastro = 'rejeitado') then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := 'Conta já teve cadastro recusado.';
  elsif v_parecido is not null then
    new.status_cadastro := 'pendente';
    new.motivo_moderacao := format('Possível repetido: já existe "%s" no app. Confira em Admin → Repetidos.', v_parecido);
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
