import { test, expect } from '@playwright/test'

test.describe('Busca pública', () => {
  test('página de busca carrega com filtros de categoria, bairro e modalidade', async ({ page }) => {
    await page.goto('/buscar')
    await expect(page.getByRole('heading', { name: /profissionais e comércios de tanguá/i })).toBeVisible()
    await expect(page.getByText('Filtrar:')).toBeVisible()
    await expect(page.getByText('Atendimento:')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Loja física' })).toBeVisible()
  })

  test('filtro de modalidade reflete na URL e mantém outros filtros', async ({ page }) => {
    await page.goto('/buscar?categoria=alimentacao')
    await page.getByRole('link', { name: 'Digital', exact: true }).click()
    await expect(page).toHaveURL(/categoria=alimentacao/)
    await expect(page).toHaveURL(/modalidade=servico_digital/)
  })

  test('busca por termo sem resultado mostra estado vazio', async ({ page }) => {
    await page.goto('/buscar?q=xxxxxnaoexistenenhumnegocioassim')
    await expect(page.getByText(/nenhum resultado encontrado/i)).toBeVisible()
  })
})

test.describe('Home', () => {
  test('carrega hero, busca rápida e pilares', async ({ page }) => {
    await page.goto('/')
    // há duas versões do hero no DOM (mobile e desktop, uma delas com
    // "hidden" via CSS conforme o breakpoint) — só a visível deve contar.
    await expect(page.locator('h1:visible')).toBeVisible()
    await expect(page.locator('input:visible[placeholder="Eletricista, salão, marcenaria, mercado..."]')).toBeVisible()
  })
})
