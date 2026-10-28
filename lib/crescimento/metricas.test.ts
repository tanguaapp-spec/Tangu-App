import { describe, expect, it } from 'vitest'
import { calcularNps, calcularReceita, calcularUso, montarPainel, type DadosBrutos } from './metricas'

const agora = new Date('2026-11-20T15:00:00Z')
const dia = (n: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(agora.getTime() - n * 86400e3))

function vazio(): DadosBrutos {
  return {
    agora,
    atividade: [],
    cadastros: [],
    negociosNovos: [],
    assinaturas: [],
    comprasPagas30d: [],
    comprasCriadas30d: [],
    investimento30dCentavos: 0,
    testesEncerrados: [],
    nps: [],
    chamados30d: [],
    negociosAtivosTotal: 0,
  }
}

describe('uso do app', () => {
  it('conta DAU, WAU e MAU por aparelho, sem repetir', () => {
    const atividade = [
      { dia: dia(0), visitante: 'a', perfil_id: null },
      { dia: dia(0), visitante: 'b', perfil_id: null },
      { dia: dia(3), visitante: 'a', perfil_id: null },
      { dia: dia(20), visitante: 'c', perfil_id: null },
      { dia: dia(40), visitante: 'd', perfil_id: null },
    ]
    const u = calcularUso(atividade, agora)
    expect([u.dau, u.wau, u.mau]).toEqual([2, 2, 3])
  })

  it('retenção da 2ª semana: quem voltou 7 a 13 dias depois do primeiro dia', () => {
    const atividade = [
      { dia: dia(30), visitante: 'x', perfil_id: null },
      { dia: dia(22), visitante: 'x', perfil_id: null },
      { dia: dia(30), visitante: 'y', perfil_id: null },
    ]
    expect(calcularUso(atividade, agora).retencaoSemana1).toBe(0.5)
  })
})

describe('receita', () => {
  it('MRR soma só ativas e em atraso; churn considera quem já pagou e saiu no mês', () => {
    const base = { criado_em: dia(100), atualizado_em: dia(5), cancelada_em: null, ja_foi_ativa: true }
    const r = calcularReceita({
      agora,
      comprasPagas30d: [{ valor_centavos: 4990 }],
      assinaturas: [
        { ...base, negocio_id: '1', status: 'ativa', valor_centavos: 3990 },
        { ...base, negocio_id: '2', status: 'em_atraso', valor_centavos: 8990 },
        { ...base, negocio_id: '3', status: 'cancelada', valor_centavos: 3990, cancelada_em: dia(10) },
        { ...base, negocio_id: '4', status: 'expirada', valor_centavos: 3990, ja_foi_ativa: false },
      ],
    })
    expect(r.mrr).toBe(12980)
    expect(r.pagantes).toBe(2)
    expect(r.perdidas).toBe(1)
    expect(r.churn).toBeCloseTo(1 / 3)
    expect(r.avulso).toBe(4990)
  })
})

describe('NPS', () => {
  it('promotores menos detratores', () => {
    const notas = [10, 9, 9, 8, 3].map((nota) => ({ nota, criado_em: dia(1) }))
    expect(calcularNps(notas).nps).toBe(40)
  })
})

describe('parecer', () => {
  it('sem dados não inventa conclusão', () => {
    const p = montarPainel(vazio())
    expect(p.categorias.every((c) => c.situacao === 'sem_dados')).toBe(true)
    expect(p.gargalo).toBeNull()
  })

  it('aponta a ativação como gargalo quando negócios novos param no meio', () => {
    const d = vazio()
    d.negociosNovos = Array.from({ length: 5 }).map((_, i) => ({
      id: String(i),
      criado_em: dia(10),
      tem_foto: i === 0,
      tem_whatsapp: true,
      primeiro_item_em: i === 0 ? dia(9) : null,
    }))
    const p = montarPainel(d)
    expect(p.gargalo?.chave).toBe('ativacao')
    expect(p.gargalo?.parecer).toMatch(/4 de 5/)
  })
})
