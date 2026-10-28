/**
 * Importação de lista pública de comércios (mesmo formato do BoraAli):
 * nome, categoria, endereço, bairro, cidade, CEP, telefone, horários, lat,
 * lng, place_id. Só dados públicos de cadastro: nada de nota, avaliação,
 * foto ou link de terceiros. Cálculo puro (testável); quem grava é a action.
 */

export type LinhaLista = {
  nome: string
  categoria: string
  endereco: string
  bairro: string
  cidade: string
  cep: string
  telefone: string
  horarios: string
  lat: number | null
  lng: number | null
  place_id: string
}

export type Destino = { tipo: 'negocio'; categoriaSlug: string } | { tipo: 'servico_util' } | { tipo: 'ignorar'; motivo: string }

export const normalizar = (t: string) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Regras em ordem (a primeira que casar vence), as mesmas do BoraAli e já
 * apontando para as categorias/subcategorias da 0025.
 * Ex.: posto com restaurante → posto; salão de beleza → subcategoria.
 */
const N = (categoriaSlug: string): Destino => ({ tipo: 'negocio', categoriaSlug })
const REGRAS: [RegExp, Destino][] = [
  [/\b(igreja|templo|paroquia)\b/, { tipo: 'ignorar', motivo: 'instituição religiosa' }],
  [
    /prefeitura|secretaria municipal|guarda municipal|reparticao publica|saude publica|hospital publico|centro medico publico|central de regulacao|escola publica|escola de ensino|escola de educacao geral|posto de saude|conselho tutelar/,
    { tipo: 'servico_util' },
  ],
  [/marco historico|organizacao nao governamental/, { tipo: 'ignorar', motivo: 'não é estabelecimento comercial' }],
  [/^caixa eletronico$/, { tipo: 'ignorar', motivo: 'caixa eletrônico' }],
  [/posto de combustivel/, N('postos-de-combustivel')],
  [/pizza/, N('pizzarias')],
  [/hamburgueria|lanchonete|sanduich|pastelaria|fast-food/, N('lanchonetes')],
  [/acai|sorvet/, N('acai-e-sorveterias')],
  [/confeitaria|doceria|bolos|biscoito/, N('doces-e-confeitarias')],
  [/padaria|panificadora/, N('padarias')],
  [/barbearia/, N('barbearias')],
  [/salao de beleza|cabeleireir|sobrancelha|saude e beleza/, N('saloes-de-beleza')],
  [/manicure/, N('manicure-e-pedicure')],
  [/estetica|depilacao/, N('estetica-e-depilacao')],
  [/restaurante|churrascaria|diner|cafeteria|\bcafe\b/, N('restaurantes')],
  [/\bbar(es)?\b/, N('bares-e-petiscos')],
  [/roupa|moda|calcado|outlet|artigos esportivos|atividades ao ar livre/, N('roupas-e-calcados')],
  [/hortifrut/, N('hortifruti')],
  [/acougue|carnes|peixaria/, N('acougues-e-peixarias')],
  [/supermercado|mercado/, N('supermercados')],
  [/comidas naturais|produtos naturais|mercearia|conveniencia/, N('mercearias-e-conveniencia')],
  [/bebida|distribuidora/, N('bebidas-e-distribuidoras')],
  [/farmacia veterinaria|veterinari/, N('veterinarias')],
  [/drogaria|farmacia|farmaceutica/, N('farmacias')],
  [/pet shop|racao|animais de estimacao|banho e tosa/, N('pet-shop')],
  [/dentista|odontolog|ortodont/, N('dentistas')],
  [/otica|oftalmolog/, N('oticas')],
  [/laboratorio|policlinica|centro medico|consultorio|medico|fisioterap|clinica|nutricion|psicolog/, N('clinicas-e-consultorios')],
  [/academia|fitness|artes marciais|pilates/, N('academias-e-esportes')],
  [/assistencia tecnica/, N('assistencia-tecnica')],
  [/celular|informatica/, N('celulares-e-informatica')],
  [/som para carros|autopecas|pneu/, N('autopecas')],
  [/eletronicos|eletrodomestico/, N('eletronicos-e-eletrodomesticos')],
  [/relojoaria|joia|bijuteria/, N('acessorios-e-bijuterias')],
  [/moveis|moveleiro|decoracao/, N('moveis-e-decoracao')],
  [/papelaria|grafica/, N('papelarias-e-graficas')],
  [/floricultura|flores/, N('floriculturas')],
  [/lava-rapido|lava jato/, N('lava-jato')],
  [/borracharia|alinhamento/, N('borracharias')],
  [/oficina|mecanic|troca de oleo|inspecao veicular|tratores/, N('mecanicos')],
  [/materiais de construcao|construcenter|ferramentas|tintas|reforma|marmoraria|vidracaria|tijolo|ceramicas/, N('material-de-construcao')],
  [/eletricista/, N('eletricistas')],
  [/encanador/, N('encanadores')],
  [/chaveiro/, N('chaveiros')],
  [/lavanderia/, N('lavanderias')],
  [/dedetiz/, N('dedetizacao')],
  [/fotograf/, N('fotografia')],
  [/mudanca|frete/, N('fretes-e-mudancas')],
  [/imobiliari/, N('imobiliarias')],
  [/advogad|juridic/, N('advocacia')],
  [/contabil/, N('contabilidade')],
  [/escola|educacional|curso/, N('escolas-e-cursos')],
  [/hotel|hospedaria|cama e cafe|pousada|dude ranch|alojamento|retiro/, N('hoteis-e-pousadas')],
  [/eventos|casamento|buffet/, N('festas-e-eventos')],
  [/banco|loterica|correspondente/, N('lotericas-e-correspondentes')],
  [/agricultura|pecuaria|fazenda|fabrica|agropecuaria/, N('agropecuaria')],
  [/presente|artigos domesticos|ceramica|utensilios|bicicleta/, N('presentes-e-variedades')],
  [/^loja$|^loja,|, loja$/, N('presentes-e-variedades')],
]

export function mapearCategoria(categoria: string, nome = ''): Destino {
  const casar = (t: string) => (t ? REGRAS.find(([re]) => re.test(normalizar(t)))?.[1] : undefined)
  // órgão público identificado pelo nome vale mais que a categoria
  const peloNome = casar(nome)
  if (peloNome?.tipo === 'servico_util') return peloNome
  // sem regra: entra em Serviços para o admin revisar
  return casar(categoria) ?? peloNome ?? N('servicos')
}

const DIAS: Record<string, string> = {
  domingo: 'dom',
  'segunda-feira': 'seg',
  'terca-feira': 'ter',
  'quarta-feira': 'qua',
  'quinta-feira': 'qui',
  'sexta-feira': 'sex',
  sabado: 'sab',
}

/** "segunda-feira: 08:00–12:00, 13:00–18:00 | domingo: Fechado" → {"seg": "08:00-12:00, 13:00-18:00", "dom": "Fechado"} */
export function converterHorarios(texto: string): Record<string, string> | null {
  const saida: Record<string, string> = {}
  for (const parte of (texto ?? '').split('|')) {
    const [diaBruto, ...resto] = parte.split(':')
    const dia = DIAS[normalizar(diaBruto ?? '')]
    const valor = resto.join(':').trim()
    if (!dia || !valor) continue
    if (/fechad/i.test(valor)) saida[dia] = 'Fechado'
    else if (/24 horas/i.test(valor)) saida[dia] = '24h'
    else {
      const faixas = Array.from(valor.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)).map((m) => `${m[1].padStart(5, '0')}-${m[2].padStart(5, '0')}`)
      if (faixas.length) saida[dia] = faixas.join(', ')
    }
  }
  return Object.keys(saida).length ? saida : null
}

/** Telefone com DDD (10 ou 11 dígitos) ou nada. Celular (9 na frente) também serve de WhatsApp. */
export function limparTelefone(bruto: string) {
  const d = (bruto ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').replace(/^0(?=\d{10,11}$)/, '')
  if (d.length !== 10 && d.length !== 11) return { telefone: null, whatsapp: null }
  return { telefone: d, whatsapp: d.length === 11 && d[2] === '9' ? d : null }
}

/** Bairro escrito de jeitos diferentes → um nome só. Vazio ou o nome da cidade → sem bairro. */
const APELIDOS_BAIRRO: Record<string, string> = {
  'chacaras de pinhao': 'Chácaras Pinhão',
  'cidade satelite': 'Cidade Satélite',
  'centro comercial joanne': 'Centro',
  'nucleo urbano de posse dos coutinhos': 'Posse dos Coutinhos',
  'bandeirantes i': 'Bandeirantes',
}
export function bairroCanonico(bruto: string, cidade = 'Tanguá') {
  const k = normalizar(bruto)
  if (!k || k === normalizar(cidade)) return null
  return APELIDOS_BAIRRO[k] ?? bruto.trim()
}

/** "R. X, 123 - Bairro, Cidade - UF, CEP" → "R. X, 123" */
export function enderecoCurto(endereco: string) {
  return ((endereco ?? '').split(' - ')[0] ?? '').trim() || null
}

/** Lê JSON (lista) ou CSV com cabeçalho. Campos ausentes viram vazio. */
export function lerArquivoLista(texto: string): LinhaLista[] {
  const t = texto.replace(/^﻿/, '').trim()
  let linhas: Record<string, unknown>[]
  if (t.startsWith('[')) {
    linhas = JSON.parse(t)
  } else {
    const registros = lerCsv(t)
    const [cab, ...dados] = registros
    if (!cab) return []
    const chaves = cab.map((c) => normalizar(c).replace(/\s+/g, '_'))
    linhas = dados.map((r) => Object.fromEntries(chaves.map((k, i) => [k, r[i] ?? ''])))
  }
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
  return linhas
    .map((l) => ({
      nome: String(l.nome ?? '').trim(),
      categoria: String(l.categoria ?? ''),
      endereco: String(l.endereco ?? ''),
      bairro: String(l.bairro ?? ''),
      cidade: String(l.cidade ?? ''),
      cep: String(l.cep ?? ''),
      telefone: String(l.telefone ?? ''),
      horarios: String(l.horarios ?? ''),
      lat: num(l.lat),
      lng: num(l.lng),
      place_id: String(l.place_id ?? '').trim(),
    }))
    .filter((l) => l.nome.length >= 2)
}

/** CSV com aspas, vírgula ou ponto e vírgula. */
function lerCsv(texto: string): string[][] {
  const sep = (texto.split('\n')[0].match(/;/g)?.length ?? 0) > (texto.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const saida: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo)
      saida.push(linha)
      linha = []
      campo = ''
    } else campo += c
  }
  if (campo || linha.length) {
    linha.push(campo)
    saida.push(linha)
  }
  return saida.filter((l) => l.some((c) => c.trim()))
}
