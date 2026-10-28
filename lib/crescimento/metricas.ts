/**
 * Métricas de crescimento do SaaS e o "parecer" automático do painel.
 * Tudo aqui é cálculo puro sobre linhas já buscadas (testável sem banco);
 * a busca fica em lib/crescimento/dados.ts.
 */

export type Situacao = 'bom' | 'atencao' | 'critico' | 'sem_dados'

export type Indicador = { rotulo: string; valor: string; ajuda: string }

export type Categoria = {
  chave: 'aquisicao' | 'ativacao' | 'engajamento' | 'retencao' | 'receita' | 'conversao' | 'satisfacao'
  titulo: string
  pergunta: string
  situacao: Situacao
  indicadores: Indicador[]
  parecer: string
  acao: string
}

export type DadosBrutos = {
  agora: Date
  atividade: { dia: string; visitante: string; perfil_id: string | null }[]
  cadastros: { criado_em: string }[]
  negociosNovos: { id: string; criado_em: string; tem_foto: boolean; tem_whatsapp: boolean; primeiro_item_em: string | null }[]
  assinaturas: { negocio_id: string; status: string; valor_centavos: number; criado_em: string; cancelada_em: string | null; atualizado_em: string; ja_foi_ativa: boolean }[]
  comprasPagas30d: { valor_centavos: number }[]
  comprasCriadas30d: { status: string }[]
  investimento30dCentavos: number
  testesEncerrados: { negocio_id: string }[]
  nps: { nota: number; criado_em: string }[]
  chamados30d: { status: string; avaliacao: number | null }[]
  negociosAtivosTotal: number
}

const DIA = 86400e3
const pct = (n: number) => `${Math.round(n * 100)}%`
const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const diaISO = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
const pior = (...s: Situacao[]): Situacao => (s.includes('critico') ? 'critico' : s.includes('atencao') ? 'atencao' : s.every((x) => x === 'sem_dados') ? 'sem_dados' : 'bom')
const faixa = (valor: number, critico: number, atencao: number, maiorMelhor = true): Situacao =>
  maiorMelhor ? (valor < critico ? 'critico' : valor < atencao ? 'atencao' : 'bom') : valor > critico ? 'critico' : valor > atencao ? 'atencao' : 'bom'

function mediana(nums: number[]) {
  if (!nums.length) return null
  const o = [...nums].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

/** DAU/WAU/MAU, aderência, frequência e retenção por coorte semanal. */
export function calcularUso(atividade: DadosBrutos['atividade'], agora: Date) {
  const hoje = diaISO(agora)
  const desde = (dias: number) => diaISO(new Date(agora.getTime() - (dias - 1) * DIA))
  const unicos = (de: string) => new Set(atividade.filter((a) => a.dia >= de && a.dia <= hoje).map((a) => a.visitante))
  const dau = unicos(hoje).size
  const wau = unicos(desde(7)).size
  const mau = unicos(desde(30)).size
  // média de DAU nos últimos 7 dias (um dia isolado oscila demais)
  const porDia = new Map<string, Set<string>>()
  for (const a of atividade) {
    if (!porDia.has(a.dia)) porDia.set(a.dia, new Set())
    porDia.get(a.dia)!.add(a.visitante)
  }
  let soma = 0
  for (let i = 0; i < 7; i++) soma += porDia.get(desde(i + 1))?.size ?? 0
  const dauMedio = soma / 7
  const aderencia = mau ? dauMedio / mau : 0

  const diasPorVisitante = new Map<string, number>()
  for (const a of atividade) if (a.dia >= desde(30)) diasPorVisitante.set(a.visitante, (diasPorVisitante.get(a.visitante) ?? 0) + 1)
  const frequencia = mau ? Array.from(diasPorVisitante.values()).reduce((s, n) => s + n, 0) / mau : 0

  // coortes: semana do primeiro dia visto; volta = ativo de 7 a 13 dias depois
  const primeiro = new Map<string, string>()
  const diasDe = new Map<string, Set<string>>()
  for (const a of [...atividade].sort((x, y) => x.dia.localeCompare(y.dia))) {
    if (!primeiro.has(a.visitante)) primeiro.set(a.visitante, a.dia)
    if (!diasDe.has(a.visitante)) diasDe.set(a.visitante, new Set())
    diasDe.get(a.visitante)!.add(a.dia)
  }
  const somaDias = (iso: string, n: number) => diaISO(new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * DIA))
  const coortes: { semana: string; novos: number; voltaram: number }[] = []
  for (let s = 5; s >= 2; s--) {
    const ini = desde(7 * s)
    const fim = desde(7 * s - 6)
    const novos = Array.from(primeiro.entries()).filter(([, d]) => d >= ini && d <= fim)
    const voltaram = novos.filter(([v, d]) => Array.from(diasDe.get(v)!).some((x) => x >= somaDias(d, 7) && x <= somaDias(d, 13))).length
    coortes.push({ semana: ini, novos: novos.length, voltaram })
  }
  const base = coortes.filter((c) => c.novos > 0)
  const retencaoSemana1 = base.length ? base.reduce((s, c) => s + c.voltaram, 0) / base.reduce((s, c) => s + c.novos, 0) : null
  const novos7 = Array.from(primeiro.values()).filter((d) => d >= desde(7)).length
  const novos7Anterior = Array.from(primeiro.values()).filter((d) => d >= desde(14) && d < desde(7)).length
  return { dau, dauMedio, wau, mau, aderencia, frequencia, coortes, retencaoSemana1, novos7, novos7Anterior }
}

export function calcularReceita(d: Pick<DadosBrutos, 'assinaturas' | 'comprasPagas30d' | 'agora'>) {
  const pagantes = d.assinaturas.filter((a) => a.status === 'ativa' || a.status === 'em_atraso')
  const mrr = pagantes.reduce((s, a) => s + a.valor_centavos, 0)
  const arpu = pagantes.length ? mrr / pagantes.length : 0
  const ha30 = d.agora.getTime() - 30 * DIA
  const perdidas = d.assinaturas.filter(
    (a) => a.ja_foi_ativa && (a.status === 'cancelada' || a.status === 'expirada') && new Date(a.cancelada_em ?? a.atualizado_em).getTime() >= ha30
  ).length
  const baseInicio = pagantes.length + perdidas
  const churn = baseInicio ? perdidas / baseInicio : 0
  // LTV = ARPU / churn mensal; sem churn, usa 24 meses como teto prudente
  const ltv = churn > 0 ? arpu / churn : arpu * 24
  const avulso = d.comprasPagas30d.reduce((s, c) => s + c.valor_centavos, 0)
  const novosPagantes30d = pagantes.filter((a) => new Date(a.criado_em).getTime() >= ha30).length
  return { pagantes: pagantes.length, mrr, arpu, churn, perdidas, ltv, avulso, novosPagantes30d }
}

export function calcularNps(nps: DadosBrutos['nps']) {
  if (!nps.length) return { nps: null as number | null, respostas: 0, promotores: 0, detratores: 0 }
  const promotores = nps.filter((r) => r.nota >= 9).length
  const detratores = nps.filter((r) => r.nota <= 6).length
  return { nps: Math.round(((promotores - detratores) / nps.length) * 100), respostas: nps.length, promotores, detratores }
}

/** Monta as 7 categorias com situação, números e o parecer em português simples. */
export function montarPainel(d: DadosBrutos): { categorias: Categoria[]; gargalo: Categoria | null; resumo: string } {
  const uso = calcularUso(d.atividade, d.agora)
  const rec = calcularReceita(d)
  const nps = calcularNps(d.nps)
  const ha30 = d.agora.getTime() - 30 * DIA
  const cadastros30 = d.cadastros.filter((c) => new Date(c.criado_em).getTime() >= ha30).length

  // 1. Aquisição
  const conversaoCadastro = uso.mau ? cadastros30 / uso.mau : 0
  const cac = rec.novosPagantes30d ? d.investimento30dCentavos / rec.novosPagantes30d : null
  const crescimentoVisitantes = uso.novos7Anterior ? (uso.novos7 - uso.novos7Anterior) / uso.novos7Anterior : null
  const sitAq: Situacao =
    uso.mau < 30
      ? 'sem_dados'
      : pior(faixa(conversaoCadastro, 0.02, 0.05), cac !== null && rec.arpu > 0 && cac > rec.arpu * 3 ? 'atencao' : 'bom', crescimentoVisitantes !== null && crescimentoVisitantes < -0.3 ? 'atencao' : 'bom')
  const aquisicao: Categoria = {
    chave: 'aquisicao',
    titulo: 'Aquisição',
    pergunta: 'Está chegando gente nova?',
    situacao: sitAq,
    indicadores: [
      { rotulo: 'Visitantes (30 dias)', valor: String(uso.mau), ajuda: 'Aparelhos diferentes que abriram o app' },
      { rotulo: 'Novos nesta semana', valor: `${uso.novos7}${crescimentoVisitantes !== null ? ` (${crescimentoVisitantes >= 0 ? '+' : ''}${pct(crescimentoVisitantes)})` : ''}`, ajuda: 'Comparado com a semana anterior' },
      { rotulo: 'Cadastros (30 dias)', valor: String(cadastros30), ajuda: 'Contas criadas' },
      { rotulo: 'Visitante → cadastro', valor: pct(conversaoCadastro), ajuda: 'Cadastros ÷ visitantes do mês' },
      { rotulo: 'CAC', valor: cac === null ? '—' : reais(cac), ajuda: 'Investimento em divulgação ÷ novos pagantes (30 dias)' },
    ],
    parecer:
      sitAq === 'sem_dados'
        ? 'Ainda há poucos visitantes para tirar conclusão. O número fica confiável a partir de uns 30 por mês.'
        : conversaoCadastro < 0.05
          ? `Muita gente olha e pouca cria conta (${pct(conversaoCadastro)}). O app atrai, mas não dá motivo pra cadastrar.`
          : cac !== null && rec.arpu > 0 && cac > rec.arpu * 3
            ? `Cada cliente pagante está custando ${reais(cac)} em divulgação, mais de 3 meses de mensalidade.`
            : 'A entrada de gente nova está saudável.',
    acao:
      conversaoCadastro < 0.05
        ? 'Mostre o benefício do cadastro na hora certa: salvar oferta, pegar cupom, favoritar. Divulgue o link com QR nos comércios.'
        : 'Mantenha a frequência de posts no Instagram e peça aos comércios para colar o QR code no balcão.',
  }

  // 2. Ativação
  const novos = d.negociosNovos
  const ativados = novos.filter((n) => n.tem_foto && n.tem_whatsapp && n.primeiro_item_em)
  const taxaAtivacao = novos.length ? ativados.length / novos.length : 0
  const horas = mediana(ativados.map((n) => (new Date(n.primeiro_item_em!).getTime() - new Date(n.criado_em).getTime()) / 3600e3))
  const sitAt: Situacao = novos.length < 3 ? 'sem_dados' : pior(faixa(taxaAtivacao, 0.4, 0.6), horas !== null && horas > 72 ? 'atencao' : 'bom')
  const ativacao: Categoria = {
    chave: 'ativacao',
    titulo: 'Ativação',
    pergunta: 'Quem cadastra o negócio começa a usar?',
    situacao: sitAt,
    indicadores: [
      { rotulo: 'Negócios novos (30 dias)', valor: String(novos.length), ajuda: 'Cadastrados pelo próprio dono' },
      { rotulo: 'Ativados', valor: `${ativados.length} (${pct(taxaAtivacao)})`, ajuda: 'Com foto, WhatsApp e ao menos 1 produto ou oferta' },
      { rotulo: 'Tempo até o 1º produto', valor: horas === null ? '—' : horas < 24 ? `${Math.round(horas)} h` : `${Math.round(horas / 24)} dias`, ajuda: 'Mediana entre cadastro e primeiro item' },
    ],
    parecer:
      sitAt === 'sem_dados'
        ? 'Poucos negócios novos no mês para avaliar a ativação.'
        : taxaAtivacao < 0.6
          ? `${novos.length - ativados.length} de ${novos.length} negócios novos cadastraram e pararam no meio: sem foto, sem WhatsApp ou sem nenhum produto.`
          : 'A maioria dos negócios novos completa o perfil. Bom sinal.',
    acao:
      taxaAtivacao < 0.6
        ? 'Abra Leads → "Cadastro incompleto" e chame cada um no WhatsApp oferecendo ajuda para pôr a foto e os 3 primeiros produtos.'
        : 'Peça depoimento aos negócios ativados para usar na divulgação.',
  }

  // 3. Engajamento
  const sitEn: Situacao = uso.mau < 30 ? 'sem_dados' : faixa(uso.aderencia, 0.1, 0.2)
  const engajamento: Categoria = {
    chave: 'engajamento',
    titulo: 'Engajamento',
    pergunta: 'As pessoas usam com frequência?',
    situacao: sitEn,
    indicadores: [
      { rotulo: 'Hoje (DAU)', valor: String(uso.dau), ajuda: 'Aparelhos que abriram hoje' },
      { rotulo: 'Semana (WAU)', valor: String(uso.wau), ajuda: 'Últimos 7 dias' },
      { rotulo: 'Mês (MAU)', valor: String(uso.mau), ajuda: 'Últimos 30 dias' },
      { rotulo: 'Aderência (DAU/MAU)', valor: pct(uso.aderencia), ajuda: 'Média diária ÷ mensal. Acima de 20% é ótimo' },
      { rotulo: 'Dias de uso por pessoa', valor: uso.frequencia.toFixed(1).replace('.', ','), ajuda: 'Média no mês' },
    ],
    parecer:
      sitEn === 'sem_dados'
        ? 'Ainda não há uso suficiente para medir frequência.'
        : uso.aderencia < 0.2
          ? `As pessoas abrem o app ${uso.frequencia.toFixed(1).replace('.', ',')} dias por mês, em média. Ele ainda não virou hábito.`
          : 'O app já faz parte da rotina de quem usa.',
    acao:
      uso.aderencia < 0.2
        ? 'Dê motivo pra voltar todo dia: ofertas novas, notícias da cidade, farmácia de plantão. Envie 1 notificação boa por dia, não mais.'
        : 'Mantenha conteúdo novo diário e evite excesso de notificações.',
  }

  // 4. Retenção
  const r1 = uso.retencaoSemana1
  const sitRe: Situacao = r1 === null && rec.pagantes + rec.perdidas === 0 ? 'sem_dados' : pior(r1 === null ? 'sem_dados' : faixa(r1, 0.15, 0.25), rec.pagantes + rec.perdidas < 5 ? 'sem_dados' : faixa(rec.churn, 0.1, 0.05, false))
  const retencao: Categoria = {
    chave: 'retencao',
    titulo: 'Retenção',
    pergunta: 'Quem chega continua?',
    situacao: sitRe,
    indicadores: [
      { rotulo: 'Voltam na 2ª semana', valor: r1 === null ? '—' : pct(r1), ajuda: 'Visitantes novos que voltaram 7 a 13 dias depois' },
      { rotulo: 'Churn de pagantes (30 dias)', valor: rec.pagantes + rec.perdidas ? pct(rec.churn) : '—', ajuda: 'Assinaturas perdidas ÷ pagantes no início do mês' },
      { rotulo: 'Assinaturas perdidas', valor: String(rec.perdidas), ajuda: 'Canceladas ou expiradas nos últimos 30 dias' },
      ...uso.coortes.map((c) => ({
        rotulo: `Coorte ${c.semana.split('-').reverse().slice(0, 2).join('/')}`,
        valor: c.novos ? `${c.voltaram}/${c.novos}` : '—',
        ajuda: 'Voltaram / chegaram naquela semana',
      })),
    ],
    parecer:
      sitRe === 'sem_dados'
        ? 'Ainda não há histórico suficiente para medir retenção.'
        : rec.churn > 0.05 && rec.pagantes + rec.perdidas >= 5
          ? `${rec.perdidas} negócio(s) deixaram de pagar no último mês (${pct(rec.churn)}).`
          : r1 !== null && r1 < 0.25
            ? `Só ${pct(r1)} de quem conhece o app volta na semana seguinte.`
            : 'Quem chega está ficando.',
    acao:
      rec.churn > 0.05
        ? 'Ligue para quem cancelou (Leads → "Cancelou") e pergunte o motivo. Mostre a eles o relatório de visitas antes da renovação.'
        : 'Convide quem chegou a ativar as notificações: é o principal motivo de volta.',
  }

  // 5. Receita
  const sitRc: Situacao = d.negociosAtivosTotal < 10 ? 'sem_dados' : faixa(d.negociosAtivosTotal ? rec.pagantes / d.negociosAtivosTotal : 0, 0.03, 0.08)
  const receita: Categoria = {
    chave: 'receita',
    titulo: 'Receita',
    pergunta: 'O app está se pagando?',
    situacao: sitRc,
    indicadores: [
      { rotulo: 'MRR', valor: reais(rec.mrr), ajuda: 'Receita mensal recorrente das assinaturas' },
      { rotulo: 'Divulgação avulsa (30 dias)', valor: reais(rec.avulso), ajuda: 'Banners, destaques e posts vendidos' },
      { rotulo: 'Negócios pagantes', valor: `${rec.pagantes} de ${d.negociosAtivosTotal}`, ajuda: 'Com assinatura ativa ÷ negócios no ar' },
      { rotulo: 'ARPU', valor: reais(rec.arpu), ajuda: 'Receita média por pagante' },
      { rotulo: 'LTV', valor: reais(rec.ltv), ajuda: 'Quanto um pagante deixa, em média, enquanto fica' },
    ],
    parecer:
      sitRc === 'sem_dados'
        ? 'Poucos negócios no ar para avaliar a receita.'
        : rec.pagantes / Math.max(1, d.negociosAtivosTotal) < 0.08
          ? `Só ${rec.pagantes} de ${d.negociosAtivosTotal} negócios pagam. A base gratuita é grande e quase não vira receita.`
          : 'A proporção de pagantes está boa para o tamanho da cidade.',
    acao:
      rec.pagantes / Math.max(1, d.negociosAtivosTotal) < 0.08
        ? 'Trabalhe a lista Leads → "Gratuito com movimento": negócios com visitas e cliques no WhatsApp são os mais fáceis de converter.'
        : 'Ofereça divulgação avulsa (banner, Instagram) aos pagantes para aumentar o ticket.',
  }

  // 6. Conversão
  const testes = d.testesEncerrados.length
  const viraramPagantes = d.testesEncerrados.filter((t) => d.assinaturas.some((a) => a.negocio_id === t.negocio_id && (a.status === 'ativa' || a.status === 'em_atraso'))).length
  const taxaTeste = testes ? viraramPagantes / testes : null
  const checkouts = d.assinaturas.filter((a) => new Date(a.criado_em).getTime() >= ha30)
  const abandonados = checkouts.filter((a) => !a.ja_foi_ativa && (a.status === 'expirada' || a.status === 'pendente')).length
  const abandonoAssin = checkouts.length ? abandonados / checkouts.length : null
  const compras = d.comprasCriadas30d
  const abandonoCompras = compras.length ? compras.filter((c) => c.status === 'cancelada' || c.status === 'aguardando_pagamento').length / compras.length : null
  const sitCo: Situacao =
    testes < 3 && checkouts.length < 3 ? 'sem_dados' : pior(taxaTeste === null || testes < 3 ? 'sem_dados' : faixa(taxaTeste, 0.1, 0.2), abandonoAssin === null || checkouts.length < 3 ? 'sem_dados' : faixa(abandonoAssin, 0.6, 0.4, false))
  const conversao: Categoria = {
    chave: 'conversao',
    titulo: 'Conversão',
    pergunta: 'Quem testa, paga?',
    situacao: sitCo,
    indicadores: [
      { rotulo: 'Teste grátis → pago', valor: taxaTeste === null ? '—' : `${viraramPagantes}/${testes} (${pct(taxaTeste)})`, ajuda: 'Testes encerrados nos últimos 60 dias' },
      { rotulo: 'Abandono no checkout do plano', valor: abandonoAssin === null ? '—' : pct(abandonoAssin), ajuda: 'Abriram o pagamento e não concluíram (30 dias)' },
      { rotulo: 'Abandono na divulgação', valor: abandonoCompras === null ? '—' : pct(abandonoCompras), ajuda: 'Compras de banner/destaque não pagas (30 dias)' },
    ],
    parecer:
      sitCo === 'sem_dados'
        ? 'Ainda há poucos testes e checkouts para medir conversão.'
        : abandonoAssin !== null && abandonoAssin > 0.4
          ? `${abandonados} de ${checkouts.length} pessoas abriram o pagamento e desistiram. Algo no checkout trava: preço, forma de pagamento ou dúvida.`
          : taxaTeste !== null && taxaTeste < 0.2
            ? `Só ${pct(taxaTeste)} dos testes grátis viram assinatura.`
            : 'Quem testa está assinando.',
    acao:
      abandonoAssin !== null && abandonoAssin > 0.4
        ? 'Chame no WhatsApp quem abandonou (Leads → "Abandonou o pagamento"): muitas vezes é dúvida sobre Pix ou cartão.'
        : 'Faça contato 3 dias antes do fim do teste mostrando quantas visitas o negócio recebeu.',
  }

  // 7. Satisfação
  const csatRespostas = d.chamados30d.filter((c) => c.avaliacao !== null)
  const csat = csatRespostas.length ? csatRespostas.filter((c) => (c.avaliacao ?? 0) >= 4).length / csatRespostas.length : null
  const abertos = d.chamados30d.filter((c) => c.status === 'aberto' || c.status === 'escalado').length
  const sitSa: Situacao = nps.respostas < 10 && csatRespostas.length < 5 ? 'sem_dados' : pior(nps.respostas < 10 || nps.nps === null ? 'sem_dados' : faixa(nps.nps, 0, 30), csat === null || csatRespostas.length < 5 ? 'sem_dados' : faixa(csat, 0.6, 0.8), abertos > 10 ? 'atencao' : 'bom')
  const satisfacao: Categoria = {
    chave: 'satisfacao',
    titulo: 'Satisfação',
    pergunta: 'As pessoas gostam do app?',
    situacao: sitSa,
    indicadores: [
      { rotulo: 'NPS', valor: nps.nps === null ? '—' : String(nps.nps), ajuda: `% que recomendam − % que criticam (${nps.respostas} respostas, 90 dias)` },
      { rotulo: 'CSAT do suporte', valor: csat === null ? '—' : pct(csat), ajuda: 'Atendimentos avaliados com 4 ou 5' },
      { rotulo: 'Chamados (30 dias)', valor: `${d.chamados30d.length} (${abertos} abertos)`, ajuda: 'Pedidos de ajuda recebidos' },
    ],
    parecer:
      sitSa === 'sem_dados'
        ? 'Poucas respostas de satisfação ainda. A pergunta de 0 a 10 aparece sozinha para quem usa o app há alguns dias.'
        : nps.nps !== null && nps.nps < 30
          ? `NPS ${nps.nps}: ${nps.detratores} pessoa(s) deram nota até 6. Leia os comentários delas abaixo.`
          : abertos > 10
            ? `${abertos} chamados esperando resposta.`
            : 'As pessoas estão satisfeitas.',
    acao:
      nps.nps !== null && nps.nps < 30
        ? 'Responda os comentários negativos e corrija o problema que mais aparece. Avise quem reclamou quando estiver resolvido.'
        : abertos > 10
          ? 'Responda os chamados abertos em Chamados de suporte, os mais antigos primeiro.'
          : 'Peça aos promotores (nota 9 e 10) para indicar o app a um vizinho.',
  }

  const categorias = [aquisicao, ativacao, engajamento, retencao, receita, conversao, satisfacao]
  // gargalo = primeira etapa do funil que está crítica (senão a primeira em atenção)
  const gargalo = categorias.find((c) => c.situacao === 'critico') ?? categorias.find((c) => c.situacao === 'atencao') ?? null
  const resumo = gargalo
    ? `O principal gargalo agora é ${gargalo.titulo.toLowerCase()}: ${gargalo.parecer} ${gargalo.acao}`
    : categorias.every((c) => c.situacao === 'sem_dados')
      ? 'Ainda não há dados suficientes. Os números aparecem conforme as pessoas usam o app.'
      : 'Nenhum gargalo grave agora. Continue acompanhando semanalmente.'
  return { categorias, gargalo, resumo }
}
