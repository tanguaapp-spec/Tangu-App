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
    await page.getByRole('link', { name: 'Serviço digital' }).click()
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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByPlaceholder(/eletricista, salão/i)).toBeVisible()
  })
})
