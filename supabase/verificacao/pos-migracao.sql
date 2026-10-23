-- =====================================================================
-- Conferência pós-migração (0016–0019) — SOMENTE LEITURA
-- Cole no SQL Editor do Supabase depois de aplicar as migrations.
-- Cada bloco diz o resultado esperado.
-- =====================================================================

-- 1) QUEM É ADMIN AGORA. Esperado: só você (e quem você autorizou).
--    Se aparecer alguém desconhecido: pode ter se cadastrado como admin pela
--    brecha corrigida na 0016. Revogue com:  select public.revogar_admin('email@...');
select u.email, a.concedido_em, a.observacao
from public.administradores_plataforma a
join auth.users u on u.id = a.perfil_id
order by a.concedido_em;

-- 1b) Contas que tinham papel=admin em perfis antes da 0016 e quando foram criadas
--     (compare com a data em que você se tornou admin).
select u.email, u.created_at, p.papel
from public.perfis p join auth.users u on u.id = p.id
where p.papel = 'admin'
order by u.created_at;

-- 2) Funções privilegiadas fora da API pública. Esperado: todas "false".
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_executa,
       has_function_privilege('authenticated', p.oid, 'execute') as logado_executa
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('conceder_admin', 'revogar_admin', 'verificar_rate_limit');

-- 3) Colunas privadas de perfis. Esperado: anon e authenticated SEM select em telefone/whatsapp.
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'perfis' and grantee in ('anon', 'authenticated')
order by grantee, column_name, privilege_type;

-- 4) RLS ligado em todas as tabelas do schema public. Esperado: nenhuma linha.
select c.relname as tabela_sem_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 5) Planos e configurações semeados. Esperado: 3 planos, 6 configurações.
select id, nome, preco_centavos, ativo, limites from public.planos order by ordem;
select chave, valor, publico from public.configuracoes_sistema order by chave;

-- 6) Bucket de imagens com limite. Esperado: 5242880 e 4 tipos de imagem.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'imagens';

-- 7) Sites de negócio antigos que não começam com http(s) (o app já não
--    renderiza esses links, mas vale corrigir). Depois de corrigir, rode:
--    alter table public.negocios validate constraint negocios_site_http;
select id, nome, site from public.negocios where site is not null and site !~* '^https?://[^\s]+$';

-- 8) Migration 0020. Esperado: nenhum negócio sem slug; total_avaliacoes
--    igual à contagem real; funções do servidor fora da API pública.
select count(*) as negocios_sem_slug from public.negocios where slug is null;
select n.id, n.nome, n.total_avaliacoes, count(a.id) as real
from public.negocios n left join public.avaliacoes a on a.negocio_id = n.id
group by n.id having n.total_avaliacoes <> count(a.id);
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_executa,
       has_function_privilege('authenticated', p.oid, 'execute') as logado_executa
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('perfil_id_por_email', 'registrar_impressoes', 'recalcular_nota_negocio');
select chave, valor from public.configuracoes_sistema where chave in ('dias_teste_gratis', 'plano_teste_gratis', 'dias_bonus_indicacao');
