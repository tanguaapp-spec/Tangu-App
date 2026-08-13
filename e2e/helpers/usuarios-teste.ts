import { clienteAdmin, DOMINIO_TESTE } from './supabase-admin'

interface UsuarioTeste {
  id: string
  email: string
  senha: string
  papel: 'morador' | 'profissional'
  nomeCompleto: string
}

/**
 * Cria um usuário já confirmado via Admin API (sem depender de e-mail real).
 * Usado pelos specs de E2E pra ter uma sessão autenticada isolada por teste,
 * sem misturar com os dados de demonstração gerados por scripts/testes/gerar-massa-teste.ts.
 */
export async function criarUsuarioTeste(papel: 'morador' | 'profissional' = 'morador'): Promise<UsuarioTeste> {
  const admin = clienteAdmin()
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = `e2e.${papel}.${sufixo}@${DOMINIO_TESTE}`
  const senha = `Teste!${sufixo}Aa1`
  const nomeCompleto = `E2E ${papel} ${sufixo}`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome_completo: nomeCompleto, papel },
  })
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste E2E: ${error?.message}`)
  }

  return { id: data.user.id, email, senha, papel, nomeCompleto }
}

export async function removerUsuarioTeste(id: string) {
  const admin = clienteAdmin()
  await admin.auth.admin.deleteUser(id).catch(() => {})
}
