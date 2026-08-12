import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

// Roda contra o build de produção local (npm run build && npm run start),
// apontando pro mesmo Supabase de produção — não existe staging ainda.
// Ver e2e/README.md pra instruções de uso.
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // fluxos de auth/estado compartilhado — mais seguro sequencial
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
