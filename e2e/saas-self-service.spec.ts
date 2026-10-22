import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { loginPelaUI } from './helpers/ui'
import { clienteAdmin } from './helpers/supabase-admin'

/**
 * Fluxos self-service da rodada SaaS (migrations 0016–0019).
 * Rodar contra um projeto Supabase de STAGING com as migrations aplicadas
 * (ver docs/DEPLOY.md) — estes testes criam dados.
 */

test.describe('Páginas públicas', () => {
  test('preços vêm do banco e explicam cancelamento', async ({ page }) => {
    await page.goto('/planos')
    await expect(page.getByRole('heading', { name: 'Gratuito' })).toBeVisible()
    await expect(page.getByText(/sem fidelidade/i).first()).toBeVisible()
  })

  test('central de ajuda encontra artigo pela busca', async ({ page }) => {
    await page.goto('/ajuda?q=esqueci+a+senha')
    await page.getByRole('link', { name: /esqueci minha senha/i }).first().click()
    await expect(page.getByRole('heading', { name: /esqueci minha senha/i })).toBeVisible()
  })

  test('recuperação de senha responde igual pra e-mail inexistente (sem enumeração)', async ({ page }) => {
    await page.goto('/esqueci-senha')
    await page.getByLabel(/e-mail da sua conta/i).fill(`naoexiste.${Date.now()}@tangua-app-teste.dev`)
    await page.getByRole('button', { name: /enviar link/i }).click()
    await expect(page.getByText(/se existir uma conta com esse e-mail/i)).toBeVisible()
  })

  test('área administrativa redireciona quem não é admin', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/painel/admin/planos')
      await expect(page).not.toHaveURL(/\/painel\/admin/)
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })
})

test.describe('Profissional autônomo', () => {
  test('cadastro autônomo não pede endereço e mostra área de atendimento', async ({ page }) => {
    const usuario = await criarUsuarioTeste('profissional')
    try {
      await loginPelaUI(page, usuario.email, usuario.senha)
      await page.goto('/painel/negocio/cadastrar')
      await page.getByText('Sou profissional autônomo').click()
      await expect(page.getByLabel(/^endereço/i)).toHaveCount(0)
      await page.getByLabel(/seu nome profissional/i).fill('[TESTE-E2E] Ana Manicure')
      await page.locator('#categoria_id').selectOption({ index: 1 })
      await page.getByLabel(/whatsapp/i).fill('(21) 99999-9999')
      await page.getByLabel(/onde você atende/i).fill('Tanguá toda')
      await page.getByRole('button', { name: /criar meu perfil/i }).click()
      await expect(page.getByText(/seu perfil está \d+% pronto/i)).toBeVisible()

      const { data } = await clienteAdmin().from('negocios').select('tipo_perfil, endereco, status_cadastro').eq('reivindicado_por', usuario.id).single()
      expect(data).toMatchObject({ tipo_perfil: 'autonomo', endereco: null, status_cadastro: 'aprovado' })
    } finally {
      await clienteAdmin().from('negocios').delete().eq('reivindicado_por', usuario.id)
      await removerUsuarioTeste(usuario.id)
    }
  })
})

test.describe('Suporte e privacidade', () => {
  test('morador abre chamado e acompanha em "Meus chamados"', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/ajuda/contato')
      await page.getByLabel('Assunto').fill('Teste E2E de suporte')
      await page.getByLabel(/conte o que aconteceu/i).fill('Mensagem de teste automatizado, pode ignorar.')
      await page.getByRole('button', { name: /enviar chamado/i }).click()
      await expect(page.getByText(/chamado aberto/i)).toBeVisible()
      await page.goto('/ajuda/chamados')
      await expect(page.getByText('Teste E2E de suporte')).toBeVisible()
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('exportação de dados devolve JSON só da própria pessoa', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      const resposta = await page.request.get('/api/conta/exportar')
      expect(resposta.status()).toBe(200)
      const json = await resposta.json()
      expect(json.conta.email).toBe(morador.email)
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('exclusão de conta exige senha correta', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    let excluido = false
    try {
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto('/perfil#privacidade')
      await page.getByRole('button', { name: /excluir minha conta/i }).click()
      await page.getByLabel('Sua senha').fill('senha-errada')
      await page.getByLabel('Digite EXCLUIR').fill('EXCLUIR')
      await page.getByRole('button', { name: /excluir definitivamente/i }).click()
      await expect(page.getByText('Senha incorreta.')).toBeVisible()

      await page.getByLabel('Sua senha').fill(morador.senha)
      await page.getByRole('button', { name: /excluir definitivamente/i }).click()
      await expect(page).toHaveURL(/conta=excluida/)
      excluido = true
      const { data } = await clienteAdmin().auth.admin.getUserById(morador.id)
      expect(data.user).toBeNull()
    } finally {
      if (!excluido) await removerUsuarioTeste(morador.id)
    }
  })
})
