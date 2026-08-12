import { test, expect } from '@playwright/test'

test.describe('Mural e Vagas (páginas públicas)', () => {
  test('mural carrega sem erro', async ({ page }) => {
    const respostas: number[] = []
    page.on('response', (r) => respostas.push(r.status()))
    await page.goto('/mural')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(respostas.some((s) => s >= 500)).toBe(false)
  })

  test('vagas carrega sem erro', async ({ page }) => {
    const respostas: number[] = []
    page.on('response', (r) => respostas.push(r.status()))
    await page.goto('/vagas')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(respostas.some((s) => s >= 500)).toBe(false)
  })

  test('ferramentas carrega sem erro', async ({ page }) => {
    await page.goto('/ferramentas')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
