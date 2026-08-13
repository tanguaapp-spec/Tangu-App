/**
 * REMOÇÃO DA MASSA DE DADOS DE TESTE — TANGUÁ APP
 * =================================================
 * Roda localmente com: npx tsx scripts/testes/remover-massa-teste.ts
 *
 * Remove os 11 profissionais + 3 moradores de teste (14 contas) gerados por
 * gerar-massa-teste.ts, e tudo que depende deles (negócios, avaliações,
 * favoritos, posts, produtos, cupons, vagas, cartões fidelidade, pontos
 * Laranjas, respostas/reações no mural, solicitações de reivindicação).
 *
 * Fonte da verdade: scripts/testes/massa-teste-gerada.json (ids exatos,
 * gerados quando a massa foi criada) — nunca usa "like '[TESTE]%'" sozinho
 * pra decidir o que apagar, exatamente pra não arriscar apagar um cadastro
 * real por engano.
 *
 * Ordem de exclusão (respeita as foreign keys sem "on delete cascade"):
 *   1. vagas ligadas aos negócios de teste ou publicadas por perfil de teste
 *   2. avisos_cidade publicados por perfil de teste (cascade cuida de
 *      respostas_pergunta/reacoes_aviso daquele aviso)
 *   3. negocios de teste (cascade cuida do resto: avaliações, favoritos,
 *      posts, produtos, cupons, eventos_perfil, cartões fidelidade,
 *      solicitações de reivindicação, respostas_pergunta)
 *   4. os 14 usuários de auth (cascade apaga a linha em perfis, que por sua
 *      vez cascade em pontos_laranjas, favoritos, reações etc.)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import manifesto from './massa-teste-gerada.json'

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
  const negocioIds = manifesto.profissionais.map((p) => p.negocioId)
  const perfilIdsProfissionais = manifesto.profissionais.map((p) => p.userId)
  const perfilIdsMoradores = manifesto.moradores.map((m) => m.userId)
  const todosPerfilIds = [...perfilIdsProfissionais, ...perfilIdsMoradores]

  console.log(`Alvo: ${negocioIds.length} negócios de teste, ${todosPerfilIds.length} contas de teste.\n`)

  // 1. vagas ligadas aos negócios de teste ou publicadas por perfil de teste
  const { error: erroVagas } = await admin
    .from('vagas')
    .delete()
    .or(`negocio_id.in.(${negocioIds.join(',')}),publicado_por.in.(${todosPerfilIds.join(',')})`)
  if (erroVagas) throw new Error(`Falha ao remover vagas de teste: ${erroVagas.message}`)
  console.log('✔ Vagas de teste removidas.')

  // 2. avisos_cidade publicados por perfil de teste (ex: perguntas no mural)
  const { error: erroAvisos } = await admin
    .from('avisos_cidade')
    .delete()
    .in('publicado_por', todosPerfilIds)
  if (erroAvisos) throw new Error(`Falha ao remover avisos de teste: ${erroAvisos.message}`)
  console.log('✔ Avisos/perguntas de teste removidos.')

  // 3. negócios de teste (cascade cuida do resto)
  const { data: negociosRemovidos, error: erroNegocios } = await admin
    .from('negocios')
    .delete()
    .in('id', negocioIds)
    .select('id, nome')
  if (erroNegocios) throw new Error(`Falha ao remover negócios de teste: ${erroNegocios.message}`)
  console.log(`✔ ${negociosRemovidos?.length ?? 0} negócio(s) de teste removidos:`)
  for (const n of negociosRemovidos ?? []) console.log(`  - ${n.nome}`)

  // 4. os 14 usuários de auth (cascade apaga a linha em perfis e tudo ligado a ela)
  let contasRemovidas = 0
  for (const id of todosPerfilIds) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.includes('User not found')) {
      console.error(`  ✗ Falha ao remover conta ${id}: ${error.message}`)
      continue
    }
    contasRemovidas++
  }
  console.log(`✔ ${contasRemovidas}/${todosPerfilIds.length} contas de teste removidas.`)

  console.log('\nConcluído. A massa de teste foi totalmente removida do banco de produção.')
}

main().catch((err) => {
  console.error('\nFALHA:', err)
  process.exit(1)
})
