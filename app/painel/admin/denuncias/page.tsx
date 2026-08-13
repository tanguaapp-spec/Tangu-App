import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { AcoesDenuncia } from '@/components/painel/acoes-denuncia'
import { Flag, ShieldCheck } from 'lucide-react'
import { Selo } from '@/components/ui/selo'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const rotulosTipo: Record<string, string> = {
  avaliacao: 'Avaliação',
  aviso: 'Aviso/pergunta do mural',
  resposta_pergunta: 'Resposta de negócio a pergunta',
}

export default async function PainelDenuncias() {
  await requireAdminOrRedirect()
  const supabase = createClient()

  const { data: denuncias, error } = await supabase
    .from('denuncias')
    .select('*, denunciante:perfis!denuncias_denunciante_id_fkey(nome_completo), negocio:negocios(nome)')
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true })
    .limit(100)

  if (error) console.error('Erro ao buscar denúncias:', error.message)

  // Hidrata o conteúdo original de cada denúncia (não dá pra fazer join
  // direto — conteudo_id aponta pra tabelas diferentes conforme o tipo).
  const idsAvaliacao = (denuncias ?? []).filter((d) => d.tipo_conteudo === 'avaliacao').map((d) => d.conteudo_id)
  const idsAviso = (denuncias ?? []).filter((d) => d.tipo_conteudo === 'aviso').map((d) => d.conteudo_id)
  const idsResposta = (denuncias ?? []).filter((d) => d.tipo_conteudo === 'resposta_pergunta').map((d) => d.conteudo_id)

  const [{ data: avaliacoes }, { data: avisos }, { data: respostas }] = await Promise.all([
    idsAvaliacao.length
      ? supabase.from('avaliacoes').select('id, comentario, nota').in('id', idsAvaliacao)
      : Promise.resolve({ data: [] as any[] }),
    idsAviso.length
      ? supabase.from('avisos_cidade').select('id, titulo, conteudo').in('id', idsAviso)
      : Promise.resolve({ data: [] as any[] }),
    idsResposta.length
      ? supabase.from('respostas_pergunta').select('id, negocio:negocios(nome)').in('id', idsResposta)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const mapaConteudo = new Map<string, string>()
  for (const a of avaliacoes ?? []) mapaConteudo.set(a.id, `${a.nota}★ — ${a.comentario || '(sem comentário)'}`)
  for (const a of avisos ?? []) mapaConteudo.set(a.id, `${a.titulo}${a.conteudo ? ' — ' + a.conteudo : ''}`)
  for (const r of respostas ?? []) mapaConteudo.set(r.id, `Resposta de ${(r.negocio as any)?.nome ?? 'negócio removido'}`)

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Denúncias</h1>
      <p className="text-barro-600">Conteúdo denunciado por usuários, aguardando revisão.</p>

      {!denuncias || denuncias.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <ShieldCheck className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhuma denúncia pendente. Tudo em dia!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {denuncias.map((d: any) => (
            <div key={d.id} className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Selo tom="aviso">
                      <Flag className="h-3.5 w-3.5" />
                      {rotulosTipo[d.tipo_conteudo] ?? d.tipo_conteudo}
                    </Selo>
                    <span className="text-xs text-barro-400">
                      {formatDistanceToNow(new Date(d.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="mt-2 rounded-lg bg-barro-50 p-3 text-sm text-barro-700">
                    {mapaConteudo.get(d.conteudo_id) ?? 'Conteúdo original não encontrado (já pode ter sido removido).'}
                  </p>
                  <p className="mt-2 text-sm text-barro-700">
                    <span className="font-medium">Motivo da denúncia:</span> {d.motivo}
                  </p>
                  <p className="mt-1 text-xs text-barro-500">
                    Denunciado por {d.denunciante?.nome_completo ?? 'usuário removido'}
                    {d.negocio?.nome ? ` · negócio: ${d.negocio.nome}` : ''}
                  </p>
                </div>
                <AcoesDenuncia denunciaId={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
