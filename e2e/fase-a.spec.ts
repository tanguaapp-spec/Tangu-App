import { test, expect } from '@playwright/test'
import path from 'path'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'
import manifesto from '../scripts/testes/massa-teste-gerada.json'

const NEGOCIO_TESTE = manifesto.profissionais[0] // [TESTE] Mercearia da Praça
const SENHA_MASSA_TESTE = 'TanguaTeste!2026Aa'
const FOTO_TESTE = path.resolve(__dirname, '../public/favicon.png')

test.describe('Fase A — confiança & loop diário', () => {
  test('home mostra o "Achado do dia"', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Achado do dia')).toBeVisible()
  })

  test('perfil mostra bairro, opt-in de resumo diário e selos', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/perfil')
      await expect(page.getByLabel('Bairro', { exact: true })).toBeVisible()
      await expect(page.getByText(/resumo diário do meu bairro/i)).toBeVisible()
      await expect(page.getByText(/desbloquear seus primeiros selos/i)).toBeVisible()
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('morador avalia com foto e o dono responde', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      // 1) morador avalia com foto
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto(`/negocio/${NEGOCIO_TESTE.negocioId}`)
      const formAvaliacao = page.locator('form', { hasText: 'Deixe sua avaliação' })
      await formAvaliacao.locator('button[type="button"]').nth(4).click() // 5ª estrela
      await page.getByLabel(/comentário/i).fill('Ótimo atendimento — avaliação de teste E2E.')
      await page.locator('#foto-avaliacao').setInputFiles(FOTO_TESTE)
      await formAvaliacao.getByRole('button', { name: /enviar avaliação/i }).click()
      await expect(
        page.getByRole('paragraph').filter({ hasText: 'Ótimo atendimento — avaliação de teste E2E.' })
      ).toBeVisible({ timeout: 15000 })

      // sai
      const botaoMenu = page.getByRole('button', { name: /abrir menu/i })
      if (await botaoMenu.isVisible()) await botaoMenu.click()
      await page.getByRole('button', { name: /sair/i }).first().click()
      await page.waitForURL('/')

      // 2) dono do negócio responde
      await loginPelaUI(page, NEGOCIO_TESTE.email, SENHA_MASSA_TESTE)
      await page.goto('/painel/negocio')
      await expect(page.getByText('Ótimo atendimento — avaliação de teste E2E.')).toBeVisible()
      await page.getByRole('button', { name: /responder avaliação/i }).first().click()
      await page.getByLabel(/responder/i).fill('Obrigado pela avaliação de teste!')
      await page.getByRole('button', { name: /enviar resposta/i }).click()
      await expect(page.getByText(/obrigado pela avaliação de teste/i)).toBeVisible({ timeout: 15000 })
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })
})
