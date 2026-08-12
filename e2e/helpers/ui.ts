import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Loga pela tela real de /entrar (não via API) — testa o fluxo de verdade. */
export async function loginPelaUI(page: Page, email: string, senha: string) {
  await page.goto('/entrar')
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(senha)
  await page.getByRole('button', { name: /entrar/i }).click()
  // login bem-sucedido redireciona pra fora de /entrar
  await expect(page).not.toHaveURL(/\/entrar/, { timeout: 15_000 })
}
