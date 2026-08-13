import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'
import manifesto from '../scripts/testes/massa-teste-gerada.json'

const NEGOCIO_TESTE = manifesto.profissionais[2] // [TESTE] Oficina do Zé
const SENHA_MASSA_TESTE = 'TanguaTeste!2026Aa'

test.describe('Fase C — moeda "Laranjas" & cartão fidelidade', () => {
  test('morador ganha Laranjas ao favoritar e avaliar, e vê o saldo no perfil', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)

      // favoritar credita pontos
      await page.goto(`/negocio/${NEGOCIO_TESTE.negocioId}`)
      const botaoFavoritar = page.locator('.absolute.top-3.right-3 button')
      await botaoFavoritar.click()
      // espera o coração preencher (confirma que a ação client-side rodou),
      // e dá tempo real pra requisição do server action completar antes de
      // navegar embora — senão o browser pode cancelar a requisição em voo.
      await expect(botaoFavoritar.locator('svg')).toHaveClass(/fill-casca-500/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      await page.goto('/perfil')
      await expect(page.getByText(/laranja(s)? acumulada/i)).toBeVisible()
      const saldoTexto = await page.locator('text=/^[0-9]+$/').first().textContent()
      expect(Number(saldoTexto)).toBeGreaterThan(0)
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('dono carimba o cartão fidelidade de um cliente conectado', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      // morador favorita o negócio de teste, virando elegível pro carimbo
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto(`/negocio/${NEGOCIO_TESTE.negocioId}`)
      const botaoFavoritar = page.locator('.absolute.top-3.right-3 button')
      await botaoFavoritar.click()
      // espera o coração preencher (confirma que a ação client-side rodou),
      // e dá tempo real pra requisição do server action completar antes de
      // navegar embora — senão o browser pode cancelar a requisição em voo.
      await expect(botaoFavoritar.locator('svg')).toHaveClass(/fill-casca-500/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      const botaoMenu = page.getByRole('button', { name: /abrir menu/i })
      if (await botaoMenu.isVisible()) await botaoMenu.click()
      await page.getByRole('button', { name: /sair/i }).first().click()
      await page.waitForURL('/')

      // dono carimba
      await loginPelaUI(page, NEGOCIO_TESTE.email, SENHA_MASSA_TESTE)
      await page.goto('/painel/negocio')
      await expect(page.getByRole('heading', { name: 'Cartão fidelidade' })).toBeVisible()
      const linhaCliente = page
        .locator('[data-testid="cliente-fidelidade"]')
        .filter({ hasText: morador.nomeCompleto })
      await linhaCliente.getByRole('button', { name: '+1 carimbo' }).click()
      await expect(linhaCliente.getByText('1/10 carimbos')).toBeVisible({ timeout: 10000 })
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })
})
