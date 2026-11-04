import { describe, expect, it } from 'vitest'
import { agruparDuplicados, chaveNome, chaveTelefone } from './duplicados'

describe('mesmo negócio', () => {
  it('ignora acento, maiúscula, espaço e pontuação no nome', () => {
    expect(chaveNome('Max Gym Academia')).toBe('max gym academia')
    expect(chaveNome('  max gym   academia. ')).toBe('max gym academia')
    expect(chaveNome('Máx Gym — Academia!')).toBe('max gym academia')
    expect(chaveNome('Açougue São João')).toBe('acougue sao joao')
  })

  it('telefone vira só os dígitos, com ou sem 55', () => {
    expect(chaveTelefone('(21) 99999-0000')).toBe('21999990000')
    expect(chaveTelefone('+55 21 99999-0000')).toBe('21999990000')
    expect(chaveTelefone('9999-0000')).toBe('')
    expect(chaveTelefone(null)).toBe('')
  })

  it('agrupa por nome (mais antigo primeiro) e depois por telefone, sem repetir negócio', () => {
    const grupos = agruparDuplicados([
      { id: 'a2', nome: 'Max gym academia', criado_em: '2026-10-02', whatsapp: '21911112222' },
      { id: 'a1', nome: 'MAX GYM ACADEMIA', criado_em: '2026-10-01', whatsapp: '21911112222' },
      { id: 'a3', nome: 'Max Gym Academia.', criado_em: '2026-10-03' },
      { id: 'b1', nome: 'Padaria Central', criado_em: '2026-09-01', whatsapp: '21933334444' },
      { id: 'b2', nome: 'Lanchonete Central', criado_em: '2026-09-02', telefone: '(21) 93333-4444' },
      { id: 'c1', nome: 'Sozinho', criado_em: '2026-09-01', whatsapp: '21911112222' },
    ])
    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toMatchObject({ motivo: 'nome', chave: 'max gym academia' })
    expect(grupos[0].itens.map((n) => n.id)).toEqual(['a1', 'a2', 'a3'])
    expect(grupos[1].motivo).toBe('telefone')
    expect(grupos[1].itens.map((n) => n.id)).toEqual(['b1', 'b2'])
  })
})
