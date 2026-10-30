import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { celularValido, telefoneDaConta } from './acesso'

/** Banco de mentira: devolve o perfil e os negócios informados. */
function banco(perfil: Record<string, string | null> | null, negocios: Record<string, string | null>[] = []) {
  const consulta = (tabela: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      limit: () => Promise.resolve({ data: negocios }),
      maybeSingle: () => Promise.resolve({ data: tabela === 'perfis' ? perfil : null }),
    }
    return q
  }
  return { from: consulta } as unknown as SupabaseClient
}

describe('número para o link de acesso', () => {
  it('aceita celular com DDD, com ou sem 55', () => {
    expect(celularValido('(21) 99999-0000')).toBe(true)
    expect(celularValido('5521999990000')).toBe(true)
    expect(celularValido('99990000')).toBe(false)
    expect(celularValido(null)).toBe(false)
  })

  it('prefere o WhatsApp do perfil, depois o telefone, depois o negócio', async () => {
    expect(await telefoneDaConta(banco({ whatsapp: '21999990000', telefone: '21988880000' }), 'x')).toEqual({ numero: '21999990000', origem: 'perfil' })
    expect(await telefoneDaConta(banco({ whatsapp: null, telefone: '21988880000' }), 'x')).toEqual({ numero: '21988880000', origem: 'perfil' })
    expect(await telefoneDaConta(banco({ whatsapp: '123', telefone: null }, [{ whatsapp: null, telefone: '2127470000' }]), 'x')).toEqual({
      numero: '2127470000',
      origem: 'negocio',
    })
  })

  it('sem número válido na conta, não manda para lugar nenhum', async () => {
    expect(await telefoneDaConta(banco({ whatsapp: null, telefone: null }, [{ whatsapp: '', telefone: null }]), 'x')).toBeNull()
  })
})
