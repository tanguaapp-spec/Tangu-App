-- =====================================================================
-- 0024 — Planos no formato BoraAli: Gratuito, Essencial, Destaque, Premium
-- =====================================================================
-- ATENÇÃO: muda nomes, preços e recursos que aparecem em produção.
-- Rode só quando for publicar a versão nova do app.
-- Quem já assina mantém o valor contratado (assinaturas.valor_centavos é
-- travado na contratação); o plano antigo "profissional" continua existindo
-- para quem já tem, mas some da vitrine (ativo = false).
-- Tudo continua editável em Admin → Planos e recursos.
-- =====================================================================

-- recursos ligados/desligados por plano (chaves em lib/planos/recursos.ts)
insert into public.planos (id, nome, descricao, preco_centavos, ordem, limites, recursos) values
  ('essencial', 'Essencial', 'Catálogo maior, ofertas, pedidos e agenda pelo WhatsApp.', 3990, 2,
   '{"max_produtos": 40, "max_cupons_ativos": 3, "max_posts_mes": 20, "max_fotos_galeria": 15}',
   '{"estatisticas_avancadas": false, "destaque_busca": false, "pedidos_whatsapp": true, "agenda_whatsapp": true, "redes_sociais": true, "horarios_especiais": true, "relatorio_mensal": false, "equipe": true, "fidelidade": true, "selo_profissional": false}'),
  ('premium', 'Premium', 'Tudo liberado, topo da busca, equipe e relatório mensal.', 14990, 4,
   '{"max_produtos": null, "max_cupons_ativos": null, "max_posts_mes": null, "max_fotos_galeria": 60}',
   '{"estatisticas_avancadas": true, "destaque_busca": true, "pedidos_whatsapp": true, "agenda_whatsapp": true, "redes_sociais": true, "horarios_especiais": true, "relatorio_mensal": true, "equipe": true, "fidelidade": true, "selo_profissional": true}')
on conflict (id) do nothing;

update public.planos set
  descricao = 'Perfil completo, catálogo e novidades pra começar.',
  ordem = 1,
  limites = '{"max_produtos": 5, "max_cupons_ativos": 1, "max_posts_mes": 4, "max_fotos_galeria": 5}',
  recursos = -- o que já era grátis continua grátis (redes, equipe, fidelidade): ninguém perde nada na troca
  '{"estatisticas_avancadas": false, "destaque_busca": false, "pedidos_whatsapp": false, "agenda_whatsapp": false, "redes_sociais": true, "horarios_especiais": true, "relatorio_mensal": false, "equipe": true, "fidelidade": true, "selo_profissional": false}'
where id = 'gratuito';

update public.planos set
  nome = 'Destaque',
  descricao = 'Essencial + estatísticas completas, mais ofertas e selo profissional.',
  preco_centavos = 8990,
  ordem = 3,
  limites = '{"max_produtos": 150, "max_cupons_ativos": 10, "max_posts_mes": null, "max_fotos_galeria": 30}',
  recursos = '{"estatisticas_avancadas": true, "destaque_busca": false, "pedidos_whatsapp": true, "agenda_whatsapp": true, "redes_sociais": true, "horarios_especiais": true, "relatorio_mensal": true, "equipe": true, "fidelidade": true, "selo_profissional": true}'
where id = 'destaque';

-- "Profissional" sai da vitrine; quem já assina continua com ele
update public.planos set ativo = false, ordem = 9 where id = 'profissional';

update public.configuracoes_sistema set valor = '"essencial"'
 where chave = 'plano_teste_gratis' and valor = '"profissional"';
