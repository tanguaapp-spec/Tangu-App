-- =====================================================================
-- 0025 — Categorias e subcategorias no formato do BoraAli
-- =====================================================================
-- 37 categorias principais + 24 subcategorias (ex.: Beleza e estética →
-- Barbearias, Salões, Manicure). As 12 categorias antigas NÃO são
-- apagadas: os negócios delas vão para a nova mais próxima e elas ficam
-- desativadas (somem do app, voltam com um toque no admin).
-- Rode junto com a publicação da versão nova (muda o que o público vê).
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table public.categorias add column if not exists parent_id uuid references public.categorias(id) on delete set null;
alter table public.categorias add column if not exists ativo boolean not null default true;
alter table public.categorias add column if not exists mostrar_inicio boolean not null default false;
create index if not exists categorias_parent_idx on public.categorias(parent_id);

-- público só vê categoria ativa; admin vê todas
drop policy if exists "categorias_select_publico" on public.categorias;
create policy "categorias_select_publico" on public.categorias for select using (ativo or public.eh_admin());

-- principais (ordem = ordem de exibição; as 10 primeiras viram atalho na página inicial)
insert into public.categorias (nome, slug, icone, ordem, mostrar_inicio)
select nome, slug, icone, ordem, ordem <= 10 from (values
  ('Restaurantes', 'restaurantes', 'utensils', 1),
  ('Lanchonetes', 'lanchonetes', 'sandwich', 2),
  ('Supermercados', 'supermercados', 'shopping-cart', 3),
  ('Padarias', 'padarias', 'croissant', 4),
  ('Farmácias', 'farmacias', 'pill', 5),
  ('Roupas e calçados', 'roupas-e-calcados', 'shirt', 6),
  ('Pet shop', 'pet-shop', 'paw-print', 7),
  ('Material de construção', 'material-de-construcao', 'hammer', 8),
  ('Serviços', 'servicos', 'wrench', 9),
  ('Beleza e estética', 'beleza-e-estetica', 'sparkles', 10),
  ('Pizzarias', 'pizzarias', 'pizza', 11),
  ('Bares e petiscos', 'bares-e-petiscos', 'beer', 12),
  ('Açaí e sorveterias', 'acai-e-sorveterias', 'ice-cream-cone', 13),
  ('Doces e confeitarias', 'doces-e-confeitarias', 'cake-slice', 14),
  ('Mercearias e conveniência', 'mercearias-e-conveniencia', 'store', 15),
  ('Hortifrúti', 'hortifruti', 'apple', 16),
  ('Açougues e peixarias', 'acougues-e-peixarias', 'beef', 17),
  ('Bebidas e distribuidoras', 'bebidas-e-distribuidoras', 'wine', 18),
  ('Clínicas e consultórios', 'clinicas-e-consultorios', 'stethoscope', 19),
  ('Dentistas', 'dentistas', 'smile', 20),
  ('Óticas', 'oticas', 'glasses', 21),
  ('Academias e esportes', 'academias-e-esportes', 'dumbbell', 22),
  ('Acessórios e bijuterias', 'acessorios-e-bijuterias', 'gem', 23),
  ('Presentes e variedades', 'presentes-e-variedades', 'gift', 24),
  ('Móveis e decoração', 'moveis-e-decoracao', 'sofa', 25),
  ('Eletrônicos e eletrodomésticos', 'eletronicos-e-eletrodomesticos', 'tv', 26),
  ('Celulares e informática', 'celulares-e-informatica', 'smartphone', 27),
  ('Papelarias e gráficas', 'papelarias-e-graficas', 'printer', 28),
  ('Floriculturas', 'floriculturas', 'flower-2', 29),
  ('Veterinárias', 'veterinarias', 'heart-pulse', 30),
  ('Automotivo', 'automotivo', 'car', 31),
  ('Postos de combustível', 'postos-de-combustivel', 'fuel', 32),
  ('Escolas e cursos', 'escolas-e-cursos', 'graduation-cap', 33),
  ('Hotéis e pousadas', 'hoteis-e-pousadas', 'bed', 34),
  ('Festas e eventos', 'festas-e-eventos', 'party-popper', 35),
  ('Lotéricas e correspondentes', 'lotericas-e-correspondentes', 'landmark', 36),
  ('Imobiliárias', 'imobiliarias', 'key-round', 37),
  ('Agropecuária', 'agropecuaria', 'sprout', 38)
) as v(nome, slug, icone, ordem)
on conflict (slug) do update set icone = excluded.icone, ordem = excluded.ordem, ativo = true, parent_id = null,
  mostrar_inicio = excluded.mostrar_inicio;

-- subcategorias (mãe pelo slug)
insert into public.categorias (nome, slug, icone, ordem, parent_id)
select v.nome, v.slug, v.icone, v.ordem, m.id
from (values
  ('Salões de beleza', 'saloes-de-beleza', 'sparkles', 101, 'beleza-e-estetica'),
  ('Barbearias', 'barbearias', 'scissors', 102, 'beleza-e-estetica'),
  ('Manicure e pedicure', 'manicure-e-pedicure', 'hand', 103, 'beleza-e-estetica'),
  ('Estética e depilação', 'estetica-e-depilacao', 'sparkles', 104, 'beleza-e-estetica'),
  ('Mecânicos', 'mecanicos', 'car', 105, 'automotivo'),
  ('Autopeças', 'autopecas', 'cog', 106, 'automotivo'),
  ('Lava-jato', 'lava-jato', 'droplet', 107, 'automotivo'),
  ('Borracharias', 'borracharias', 'car', 108, 'automotivo'),
  ('Professores particulares', 'professores-particulares', 'graduation-cap', 109, 'escolas-e-cursos'),
  ('Eletricistas', 'eletricistas', 'zap', 110, 'servicos'),
  ('Encanadores', 'encanadores', 'droplets', 111, 'servicos'),
  ('Pedreiros e pintores', 'pedreiros-e-pintores', 'paint-roller', 112, 'servicos'),
  ('Chaveiros', 'chaveiros', 'key', 113, 'servicos'),
  ('Técnicos de informática', 'tecnicos-de-informatica', 'laptop', 114, 'servicos'),
  ('Assistência técnica', 'assistencia-tecnica', 'smartphone', 115, 'servicos'),
  ('Serviços domésticos', 'servicos-domesticos', 'home', 116, 'servicos'),
  ('Costura e ajustes', 'costura-e-ajustes', 'scissors', 117, 'servicos'),
  ('Fretes e mudanças', 'fretes-e-mudancas', 'truck', 118, 'servicos'),
  ('Lavanderias', 'lavanderias', 'washing-machine', 119, 'servicos'),
  ('Dedetização', 'dedetizacao', 'bug', 120, 'servicos'),
  ('Jardinagem', 'jardinagem', 'sprout', 121, 'servicos'),
  ('Fotografia', 'fotografia', 'camera', 122, 'servicos'),
  ('Contabilidade', 'contabilidade', 'calculator', 123, 'servicos'),
  ('Advocacia', 'advocacia', 'scale', 124, 'servicos')
) as v(nome, slug, icone, ordem, mae)
join public.categorias m on m.slug = v.mae
on conflict (slug) do update set parent_id = excluded.parent_id, icone = excluded.icone, ordem = excluded.ordem, ativo = true;

-- negócios das categorias antigas → nova mais próxima (o admin ajusta caso a caso depois)
update public.negocios n set categoria_id = novo.id
from public.categorias antiga, public.categorias novo,
  (values
    ('alimentacao', 'restaurantes'),
    ('saude-bem-estar', 'clinicas-e-consultorios'),
    ('beleza-estetica', 'beleza-e-estetica'),
    ('casa-construcao', 'material-de-construcao'),
    ('educacao', 'escolas-e-cursos'),
    ('moda-vestuario', 'roupas-e-calcados'),
    ('servicos-profissionais', 'servicos'),
    ('agro-producao-rural', 'agropecuaria'),
    ('tecnologia', 'celulares-e-informatica'),
    ('eventos-festas', 'festas-e-eventos'),
    ('outros', 'servicos')
  ) as mapa(de, para)
where antiga.slug = mapa.de and novo.slug = mapa.para and n.categoria_id = antiga.id;

-- antigas saem de cena (sem apagar)
update public.categorias set ativo = false, mostrar_inicio = false
 where slug in ('alimentacao', 'saude-bem-estar', 'beleza-estetica', 'casa-construcao', 'educacao', 'moda-vestuario',
                'servicos-profissionais', 'agro-producao-rural', 'tecnologia', 'eventos-festas', 'outros');
