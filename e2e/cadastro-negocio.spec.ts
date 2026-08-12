import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'

test.describe('Cadastro de negócio — modalidade de atendimento (Fase 0)', () => {
  test('profissional cadastra negócio escolhendo modalidades e vê "em análise" no painel', async ({ page }) => {
    const usuario = await criarUsuarioTeste('profissional')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await page.goto('/painel/negocio/cadastrar')

      await page.getByLabel(/nome do negócio/i).fill('[TESTE-E2E] Oficina do Zé')
      await page.locator('#categoria_id').selectOption({ index: 1 })
      await page.getByLabel('Bairro').fill('Centro')

      // modalidades: loja física + vai até o cliente (duas ao mesmo tempo)
      await page.getByText('Loja física', { exact: true }).click()
      await page.getByText('Vai até o cliente', { exact: true }).click()

      await page.getByLabel(/whatsapp/i).fill('21999999999')
      await page.getByRole('button', { name: /enviar cadastro/i }).click()

      await expect(page).toHaveURL('/painel/negocio')
      await expect(page.getByText(/está em análise/i)).toBeVisible()
    } finally {
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
      await page.getByLabel(/whatsapp/i).fill('21999999999')
      await page.getByRole('button', { name: /enviar cadastro/i }).click()

      await expect(page.getByText(/escolha ao menos uma forma de atendimento/i)).toBeVisible()
      await expect(page).toHaveURL(/\/painel\/negocio\/cadastrar/)
    } finally {
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
      await page.getByRole('button', { name: /enviar cadastro/i }).click()

      await expect(page).toHaveURL('/painel/negocio')
      await expect(page.getByText(/está em análise/i)).toBeVisible()
    } finally {
      await removerUsuarioTeste(usuario.id)
    }
  })
})
