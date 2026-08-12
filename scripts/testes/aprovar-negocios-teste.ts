/**
 * APROVAÇÃO DOS CADASTROS DE TESTE — TANGUÁ APP
 * ================================================
 * Roda localmente com: npx tsx scripts/testes/aprovar-negocios-teste.ts
 *
 * Equivalente ao botão "Aprovar" do painel admin (mesmo efeito de
 * aprovarNegocioPendente em lib/actions/admin-actions.ts), mas via script —
 * só pra não depender de logar como admin no navegador pra validar a massa
 * de teste. Filtro restrito a nome começando com "[TESTE] " E
 * origem = 'cadastro_manual', nunca mexe em cadastro pendente de verdade.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: pendentes, error: erroLeitura } = await admin
    .from('negocios')
    .select('id, nome')
    .eq('status_cadastro', 'pendente')
    .eq('origem', 'cadastro_manual')
    .like('nome', '[TESTE]%')

  if (erroLeitura) throw new Error(erroLeitura.message)
  if (!pendentes || pendentes.length === 0) {
    console.log('Nenhum cadastro de teste pendente encontrado.')
    return
  }

  const { error } = await admin
    .from('negocios')
    .update({ status_cadastro: 'aprovado', ativo: true, verificado: true })
    .eq('status_cadastro', 'pendente')
    .eq('origem', 'cadastro_manual')
    .like('nome', '[TESTE]%')

  if (error) throw new Error(error.message)

  console.log(`✔ ${pendentes.length} cadastro(s) de teste aprovados:`)
  for (const p of pendentes) console.log(`  - ${p.nome} (${p.id})`)

  // Reivindicação de teste também fica aprovada automaticamente, igual o admin faria
  const { data: reivindicacoes } = await admin
    .from('solicitacoes_reivindicacao')
    .select('id, negocio_id, solicitante_id, mensagem')
    .eq('status', 'pendente')
    .like('mensagem', '%teste E2E%')

  if (reivindicacoes && reivindicacoes.length > 0) {
    for (const r of reivindicacoes) {
      await admin
        .from('negocios')
        .update({ reivindicado_por: r.solicitante_id, reivindicado_em: new Date().toISOString(), verificado: true })
        .eq('id', r.negocio_id)
      await admin.from('solicitacoes_reivindicacao').update({ status: 'aprovado' }).eq('id', r.id)
    }
    console.log(`✔ ${reivindicacoes.length} reivindicação(ões) de teste aprovadas`)
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err)
  process.exit(1)
})
