import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'
import { clienteAdmin } from './helpers/supabase-admin'

// Sem isso, cada rodada deixa um negócio "[TESTE-E2E]" órfão no banco: o
// usuário é removido no finally e (desde a 0016) reivindicado_por vira null,
// mas o negócio continua. Chamado no finally de cada teste que cadastra.
async function removerNegocioDoUsuario(usuarioId: string) {
  const admin = clienteAdmin()
  try {
    await admin.from('negocios').delete().eq('reivindicado_por', usuarioId)
  } catch {
    // ignora — cleanup de teste nunca pode quebrar o teste em si
  }
}

test.describe('Cadastro de negócio — modalidade de atendimento (Fase 0)', () => {
  test('profissional cadastra negócio e ele entra no ar na hora, com checklist de configuração', async ({ page }) => {
    const usuario = await criarUsuarioTeste('profissional')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await page.goto('/painel/negocio/cadastrar')

      await page.getByLabel(/nome do negócio/i).fill('[TESTE-E2E] Oficina do Zé')
      await page.locator('#categoria_id').selectOption({ index: 1 })
      await page.getByLabel('Bairro').fill('Centro')

      // "Loja física" já vem marcada pra ponto comercial; soma "vai até o cliente"
      await page.getByText('Vai até o cliente', { exact: true }).click()

      await page.getByLabel(/whatsapp/i).fill('21999999999')
      await page.getByRole('button', { name: /criar meu perfil/i }).click()

      await expect(page).toHaveURL(/\/painel\/negocio/)
      // autoaprovação (migration 0017): sem fila manual, já mostra o checklist
      await expect(page.getByText(/seu perfil está \d+% pronto/i)).toBeVisible()
    } finally {
      await removerNegocioDoUsuario(usuario.id)
      await removerUsuarioTeste(usuario.id)
    }
  })

  test('cadastro sem escolher nenhuma modalidade é bloqueado com mensagem clara', async ({ page }) => {
    const usuario = await criarUsuarioTeste('profissional')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await page.goto('/painel/negocio/cadastrar')
      await page.getByLabel(/nome do negócio/i).fill('[TESTE-E2E] Sem modalidade')
      await page.locator('#categoria_id').selectOption({ index: 1 })
      // desmarca a modalidade que vem pré-selecionada
      await page.getByText('Loja física', { exact: true }).click()
      await page.getByLabel(/whatsapp/i).fill('21999999999')
      await page.getByRole('button', { name: /criar meu perfil/i }).click()

      await expect(page.getByText(/escolha ao menos uma forma de atendimento/i)).toBeVisible()
      await expect(page).toHaveURL(/\/painel\/negocio\/cadastrar/)
    } finally {
      await removerNegocioDoUsuario(usuario.id)
      await removerUsuarioTeste(usuario.id)
    }
  })

  test('serviço 100% digital não exige endereço', async ({ page }) => {
    const usuario = await criarUsuarioTeste('profissional')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await page.goto('/painel/negocio/cadastrar')
      await page.getByLabel(/nome do negócio/i).fill('[TESTE-E2E] Designer Digital')
      await page.locator('#categoria_id').selectOption({ index: 1 })
      await page.getByText('Serviço digital', { exact: true }).click()
      await page.getByLabel(/whatsapp/i).fill('21999999999')
      // sem preencher endereço de propósito
      await page.getByRole('button', { name: /criar meu perfil/i }).click()

      await expect(page).toHaveURL(/\/painel\/negocio/)
      // autoaprovação (migration 0017): sem fila manual, já mostra o checklist
      await expect(page.getByText(/seu perfil está \d+% pronto/i)).toBeVisible()
    } finally {
      await removerNegocioDoUsuario(usuario.id)
      await removerUsuarioTeste(usuario.id)
    }
  })
})
