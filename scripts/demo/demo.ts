/**
 * Dados de demonstração em produção — TUDO preso a contas @tangua-teste.app.
 *
 *   npx tsx scripts/demo/demo.ts contas <arquivo-senhas.json>   cria/atualiza as contas de teste
 *   npx tsx scripts/demo/demo.ts imagens <pasta>                gera fotos ilustrativas (PNG)
 *   npx tsx scripts/demo/demo.ts eventos                        publica 3 eventos de exemplo na agenda
 *   npx tsx scripts/demo/demo.ts limpar                         apaga TUDO que as contas de teste criaram
 *
 * As contas são criadas já confirmadas (sem e-mail), com senha aleatória
 * gravada só no arquivo indicado (fora do repositório). "limpar" remove
 * negócios (e em cascata catálogo, ofertas, cupons, novidades, orçamentos
 * recebidos), avisos, vagas, avaliações, pedidos, arquivos no Storage e por
 * fim as contas. Não toca em nada de usuário real.
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

export const DOMINIO = 'tangua-teste.app'

export const CONTAS = [
  { chave: 'ana', email: `ana@${DOMINIO}`, nome: 'Ana Ribeiro', papel: 'profissional', bairro: 'Centro' },
  { chave: 'ze', email: `ze@${DOMINIO}`, nome: 'José Carlos Lima', papel: 'profissional', bairro: 'Duques', padrinho: 'ana' },
  { chave: 'padaria', email: `padaria@${DOMINIO}`, nome: 'Rosângela Souza', papel: 'profissional', bairro: 'Centro' },
  { chave: 'maria', email: `maria@${DOMINIO}`, nome: 'Maria Fernanda Costa', papel: 'morador', bairro: 'Centro', padrinho: 'ana' },
  { chave: 'joao', email: `joao@${DOMINIO}`, nome: 'João Pedro Alves', papel: 'morador', bairro: 'Pinhão' },
] as const

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env')
  return createClient(url, chave, { auth: { persistSession: false } })
}

async function idsDeTeste() {
  const s = db()
  const ids: { id: string; email: string }[] = []
  for (let pagina = 1; pagina < 50; pagina++) {
    const { data, error } = await s.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) throw error
    for (const u of data.users) if (u.email?.endsWith(`@${DOMINIO}`)) ids.push({ id: u.id, email: u.email })
    if (data.users.length < 200) break
  }
  return ids
}

async function contas(arquivo: string) {
  const s = db()
  const existentes = new Map((await idsDeTeste()).map((u) => [u.email, u.id]))
  const senhas: Record<string, string> = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : {}
  const ids: Record<string, string> = {}
  for (const c of CONTAS) {
    const senha = senhas[c.email] ?? `Tg-${randomBytes(9).toString('base64url')}`
    senhas[c.email] = senha
    let id = existentes.get(c.email)
    if (!id) {
      // padrinho: o código de convite de quem indicou (testa o bônus de indicação)
      let codigo: string | undefined
      if ('padrinho' in c && c.padrinho && ids[c.padrinho]) {
        const { data } = await s.from('perfis').select('codigo_convite').eq('id', ids[c.padrinho]).single()
        codigo = data?.codigo_convite ?? undefined
      }
      const { data, error } = await s.auth.admin.createUser({
        email: c.email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome_completo: c.nome, papel: c.papel, codigo_convite: codigo, origem: 'demo' },
      })
      if (error) throw new Error(`${c.email}: ${error.message}`)
      id = data.user.id
      console.log(`  + ${c.email}`)
    } else {
      await s.auth.admin.updateUserById(id, { password: senha })
      console.log(`  = ${c.email} (já existia, senha atualizada)`)
    }
    ids[c.chave] = id
    await s.from('perfis').update({ bairro: c.bairro, onboarding_concluido_em: new Date().toISOString() }).eq('id', id)
  }
  fs.mkdirSync(path.dirname(arquivo), { recursive: true })
  fs.writeFileSync(arquivo, JSON.stringify(senhas, null, 2))
  fs.writeFileSync(arquivo.replace(/\.json$/, '.ids.json'), JSON.stringify(ids, null, 2))
  console.log(`Senhas em ${arquivo} (fora do repositório).`)
}

/** Fotos ilustrativas: cores da marca + nome, sem imitar foto real de ninguém. */
async function imagens(pasta: string) {
  const sharp = (await import('sharp')).default
  fs.mkdirSync(pasta, { recursive: true })
  const itens: [string, string, string, string][] = [
    ['capa-salao', '#E9D9C9', '#8A3508', 'Salão da Ana'],
    ['capa-ze', '#D3DFE3', '#0E4D3A', 'Zé Eletricista'],
    ['capa-padaria', '#FFE7D6', '#8A3508', 'Padaria Central'],
    ['prod-corte', '#F4E3D7', '#5C2406', 'Corte'],
    ['prod-escova', '#EEDFF0', '#4A2A55', 'Escova'],
    ['prod-coloracao', '#F7D9C4', '#8A3508', 'Coloração'],
    ['prod-tomada', '#E3F0E8', '#0E4D3A', 'Tomadas'],
    ['prod-chuveiro', '#D7E6EE', '#1F4E63', 'Chuveiro'],
    ['prod-pao', '#FCE8C8', '#7A4A0B', 'Pão francês'],
    ['prod-bolo', '#F6D6DA', '#7A1F2E', 'Bolo'],
    ['galeria-1', '#DDEBE2', '#0E4D3A', 'Antes e depois'],
    ['galeria-2', '#FBE3D2', '#8A3508', 'Nosso espaço'],
    ['novidade', '#FFE7D6', '#13241D', 'Novidade!'],
    ['avaliacao', '#E3F0E8', '#13241D', 'Ficou ótimo'],
    ['avatar', '#C9D8CE', '#0E4D3A', 'M'],
  ]
  for (const [nome, fundo, cor, texto] of itens) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <rect width="100%" height="100%" fill="${fundo}"/>
      <circle cx="980" cy="180" r="260" fill="${cor}" opacity="0.08"/>
      <circle cx="160" cy="700" r="220" fill="${cor}" opacity="0.06"/>
      <text x="80" y="460" font-family="Arial, sans-serif" font-size="96" font-weight="700" fill="${cor}">${texto}</text>
      <text x="80" y="540" font-family="Arial, sans-serif" font-size="36" fill="${cor}" opacity="0.7">imagem de demonstração · Tanguá App</text>
    </svg>`
    await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(path.join(pasta, `${nome}.jpg`))
  }
  console.log(`${itens.length} imagens em ${pasta}`)
}

/** Eventos da agenda: só o admin publica, por isso vão pelo servidor (ligados à conta de teste). */
async function eventos() {
  const s = db()
  const [maria] = (await idsDeTeste()).filter((u) => u.email === `maria@${DOMINIO}`)
  if (!maria) throw new Error('Crie as contas primeiro.')
  const dia = (d: number, h: number) => {
    const x = new Date(Date.now() + d * 86400e3)
    x.setUTCHours(h + 3, 0, 0, 0) // horário de Brasília
    return x.toISOString()
  }
  const lista = [
    { titulo: 'Feira de produtores na praça', conteudo: 'Exemplo de evento (demonstração): frutas, verduras, doces caseiros e artesanato da região.', local_evento: 'Praça Central', bairro: 'Centro', data_evento: dia(1, 8) },
    { titulo: 'Mutirão de limpeza do rio', conteudo: 'Exemplo de evento (demonstração): traga luvas e garrafa d’água. Saída em frente à escola.', local_evento: 'Escola Municipal', bairro: 'Duques', data_evento: dia(3, 9) },
    { titulo: 'Show de forró no coreto', conteudo: 'Exemplo de evento (demonstração): música ao vivo, entrada gratuita.', local_evento: 'Coreto', bairro: 'Centro', data_evento: dia(6, 19) },
  ]
  for (const e of lista) {
    const { data: ja } = await s.from('avisos_cidade').select('id').eq('titulo', e.titulo).eq('publicado_por', maria.id).maybeSingle()
    if (ja) continue
    const { error } = await s.from('avisos_cidade').insert({ ...e, tipo: 'evento', ativo: true, publicado_por: maria.id })
    if (error) throw error
  }
  console.log('Eventos de exemplo publicados.')
}

async function limpar() {
  const s = db()
  const usuarios = await idsDeTeste()
  if (usuarios.length === 0) {
    console.log('Nenhuma conta de teste encontrada.')
    return
  }
  const ids = usuarios.map((u) => u.id)
  const { data: negocios } = await s.from('negocios').select('id').in('reivindicado_por', ids)
  const negocioIds = (negocios ?? []).map((n) => n.id)

  // arquivos no Storage (fotos dos negócios e dos usuários de teste)
  for (const pasta of [...negocioIds.map((id) => `negocios/${id}`), ...ids.map((id) => `usuarios/${id}`)]) {
    const caminhos: string[] = []
    const varrer = async (p: string) => {
      const { data } = await s.storage.from('imagens').list(p, { limit: 1000 })
      for (const item of data ?? []) {
        if (item.id) caminhos.push(`${p}/${item.name}`)
        else await varrer(`${p}/${item.name}`)
      }
    }
    await varrer(pasta)
    if (caminhos.length) await s.storage.from('imagens').remove(caminhos)
  }

  const passos: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    ['avaliações', s.from('avaliacoes').delete().in('autor_id', ids)],
    ['avaliações recebidas', negocioIds.length ? s.from('avaliacoes').delete().in('negocio_id', negocioIds) : Promise.resolve({ error: null })],
    ['pedidos de orçamento', s.from('pedidos_orcamento').delete().in('solicitante_id', ids)],
    ['avisos/eventos', s.from('avisos_cidade').delete().in('publicado_por', ids)],
    ['vagas', s.from('vagas').delete().in('publicado_por', ids)],
    ['negócios', negocioIds.length ? s.from('negocios').delete().in('id', negocioIds) : Promise.resolve({ error: null })],
  ]
  for (const [nome, p] of passos) {
    const { error } = await p
    console.log(error ? `  ✘ ${nome}: ${error.message}` : `  ✔ ${nome}`)
  }
  for (const u of usuarios) {
    const { error } = await s.auth.admin.deleteUser(u.id)
    console.log(error ? `  ✘ conta ${u.email}: ${error.message}` : `  ✔ conta ${u.email}`)
  }
}

const [comando, arg] = process.argv.slice(2)
const acoes: Record<string, () => Promise<void>> = {
  contas: () => contas(arg ?? 'demo-senhas.json'),
  imagens: () => imagens(arg ?? 'demo-imagens'),
  eventos,
  limpar,
}
if (!acoes[comando]) {
  console.log('Uso: npx tsx scripts/demo/demo.ts contas|imagens|eventos|limpar [arquivo/pasta]')
  process.exit(1)
}
acoes[comando]().catch((e) => {
  console.error(e)
  process.exit(1)
})
