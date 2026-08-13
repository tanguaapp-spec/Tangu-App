import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'
import manifesto from '../scripts/testes/massa-teste-gerada.json'

const NEGOCIO_TESTE = manifesto.profissionais[1] // [TESTE] Salão da Ana
const SENHA_MASSA_TESTE = 'TanguaTeste!2026Aa'

test.describe('Fase B — motor de vendas & social enxuto', () => {
  test('dono cria cupom relâmpago e ele aparece no perfil público', async ({ page }) => {
    await loginPelaUI(page, NEGOCIO_TESTE.email, SENHA_MASSA_TESTE)
    await page.goto('/painel/negocio')

    await expect(page.getByRole('heading', { name: 'Oferta relâmpago' })).toBeVisible()
    await page.getByLabel('Título da oferta').fill('Oferta de teste E2E')
    await page.getByLabel('Desconto').fill('15% off')
    await page.getByRole('button', { name: /publicar oferta relâmpago/i }).click()

    await expect(page.getByText('Oferta de teste E2E').first()).toBeVisible({ timeout: 15000 })

    await page.goto(`/negocio/${NEGOCIO_TESTE.negocioId}`)
    await expect(page.getByText(/oferta de teste e2e/i).first()).toBeVisible()
  })

  test('painel mostra o desempenho semanal sem erro', async ({ page }) => {
    await loginPelaUI(page, NEGOCIO_TESTE.email, SENHA_MASSA_TESTE)
    await page.goto('/painel/negocio')
    await expect(page.getByRole('heading', { name: 'Seu desempenho' })).toBeVisible()
    await expect(page.getByText('Visualizações do perfil')).toBeVisible()
    await expect(page.getByText('Cliques em "Chamar no WhatsApp"')).toBeVisible()
  })

  test('morador pergunta pra cidade, indica um negócio e reage', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    const textoPergunta = `Alguém indica um salão de beleza de confiança? (teste E2E ${Date.now()}-${Math.random().toString(36).slice(2, 6)})`
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/mural')

      await page.getByText(/alguém indica um profissional/i).click()
      await page.getByLabel(/sua pergunta/i).fill(textoPergunta)
      await page.getByRole('button', { name: 'Perguntar' }).click()

      await expect(page.getByText(textoPergunta)).toBeVisible({ timeout: 15000 })

      // escopado no card desta pergunta específica (título é único por execução)
      const card = page.locator('.entrada-lista', { has: page.getByText(textoPergunta) })

      // indica um negócio como resposta
      await card.getByRole('button', { name: 'Indicar um negócio' }).click()
      await card.getByPlaceholder('Nome do negócio...').fill('Salão da Ana')
      await card.locator('form:has(input[placeholder="Nome do negócio..."])').getByRole('button').click()
      await expect(card.getByText('[TESTE] Salão da Ana')).toBeVisible({ timeout: 10000 })
      await card.getByRole('button', { name: 'Indicar' }).click()
      await expect(card.getByRole('link', { name: /\[TESTE\] Salão da Ana/i })).toBeVisible({ timeout: 10000 })

      // reage com "gostei"
      await card.getByRole('button').filter({ hasText: '👏' }).click()
      await page.waitForTimeout(1500)
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('perfil mostra código de convite e link de indicação', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/perfil')
      await expect(page.getByRole('heading', { name: 'Indique um vizinho' })).toBeVisible()
      await expect(page.getByText(/cadastrar\?convite=/)).toBeVisible()
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('link de convite mostra aviso de boas-vindas no cadastro', async ({ page }) => {
    await page.goto('/cadastrar?convite=abc12345')
    await expect(page.getByText(/você foi indicado por um vizinho/i)).toBeVisible()
  })
})
