import { test, expect } from '@playwright/test'
import { DOMINIO_TESTE } from './helpers/supabase-admin'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'

test.describe('Autenticação', () => {
  test('cadastro pela UI (morador) leva à tela de confirmação de e-mail', async ({ page }) => {
    const sufixo = `${Date.now()}`
    await page.goto('/cadastrar')
    await page.getByRole('button', { name: 'Morador' }).click()
    await page.getByLabel(/nome completo/i).fill(`Morador Teste ${sufixo}`)
    await page.getByLabel(/e-mail/i).fill(`e2e.signup.${sufixo}@${DOMINIO_TESTE}`)
    await page.getByLabel(/senha/i).fill('SenhaForte!123')
    await page.getByRole('button', { name: /criar minha conta/i }).click()
    await expect(page).toHaveURL(/confirme-seu-email/)
  })

  test('cadastro pela UI (profissional) também funciona a partir de ?papel=profissional', async ({ page }) => {
    const sufixo = `${Date.now()}-prof`
    await page.goto('/cadastrar?papel=profissional')
    await expect(page.getByRole('button', { name: 'Profissional / Comércio' })).toHaveClass(/border-casca-500/)
    await page.getByLabel(/nome completo/i).fill(`Profissional Teste ${sufixo}`)
    await page.getByLabel(/e-mail/i).fill(`e2e.signup.${sufixo}@${DOMINIO_TESTE}`)
    await page.getByLabel(/senha/i).fill('SenhaForte!123')
    await page.getByRole('button', { name: /criar minha conta/i }).click()
    await expect(page).toHaveURL(/confirme-seu-email/)
  })

  test('login com usuário confirmado leva pra home, e sair funciona', async ({ page }) => {
    const usuario = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await expect(page).toHaveURL('/')

      await page.getByRole('button', { name: /sair/i }).first().click()
      await expect(page.getByRole('link', { name: /entrar/i }).first()).toBeVisible()
    } finally {
      await removerUsuarioTeste(usuario.id)
    }
  })

  test('login com senha errada mostra erro e não navega', async ({ page }) => {
    const usuario = await criarUsuarioTeste('morador')
    try {
      await page.goto('/entrar')
      await page.getByLabel(/e-mail/i).fill(usuario.email)
      await page.getByLabel(/senha/i).fill('senha-errada-123')
      await page.getByRole('button', { name: /entrar/i }).click()
      await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible()
      await expect(page).toHaveURL(/\/entrar/)
    } finally {
      await removerUsuarioTeste(usuario.id)
    }
  })
})
