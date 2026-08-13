import { test, expect } from '@playwright/test'
import { criarUsuarioTeste, removerUsuarioTeste } from './helpers/usuarios-teste'
import { clienteAdmin } from './helpers/supabase-admin'
import { loginPelaUI } from './helpers/ui'
import manifesto from '../scripts/testes/massa-teste-gerada.json'

const NEGOCIO_TESTE = manifesto.profissionais[2] // [TESTE] Oficina do Zé

test.describe('Moderação (denúncias) e destaque pago', () => {
  test('morador denuncia uma avaliação e a denúncia fica registrada pra revisão do admin', async ({ page }) => {
    const morador = await criarUsuarioTeste('morador')
    const admin = clienteAdmin()
    try {
      // o negócio de teste já nasce com avaliações cruzadas (gerar-massa-teste.ts),
      // então basta denunciar a que já está lá — sem precisar criar uma nova.
      await loginPelaUI(page, morador.email, morador.senha)
      await page.goto(`/negocio/${NEGOCIO_TESTE.negocioId}`)

      const botaoDenunciar = page.getByRole('button', { name: /denunciar/i }).first()
      await botaoDenunciar.click()
      await page.getByPlaceholder(/o que há de errado/i).fill('Motivo de teste E2E — conteúdo de teste automatizado.')
      await page.getByRole('button', { name: /enviar denúncia/i }).click()
      await expect(page.getByText(/denúncia enviada/i)).toBeVisible({ timeout: 10000 })

      // confirma no banco (via service role) que a denúncia ficou registrada, pendente
      const { data: denuncias } = await admin
        .from('denuncias')
        .select('id, status, motivo')
        .eq('denunciante_id', morador.id)
        .eq('tipo_conteudo', 'avaliacao')
      expect(denuncias?.length).toBeGreaterThan(0)
      expect(denuncias?.[0].status).toBe('pendente')
    } finally {
      await removerUsuarioTeste(morador.id)
    }
  })

  test('negócio com destaque ativo mostra o selo "Destaque" e aparece primeiro na busca', async ({ page }) => {
    const admin = clienteAdmin()
    const dataExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // simula o admin ativando o destaque manualmente (mesmo efeito do botão
    // "Ativar destaque" em /painel/admin/negocios, feito aqui via service
    // role pra não depender de login de admin no navegador)
    await admin
      .from('negocios')
      .update({ destaque_ativo: true, destaque_expira_em: dataExpiracao })
      .eq('id', NEGOCIO_TESTE.negocioId)

    try {
      // filtro específico (bairro do negócio de teste) pra pegar uma URL de
      // /buscar ainda não cacheada por outro teste — a página tem
      // `revalidate = 60`, então bater na mesma URL exata que outro teste já
      // visitou poderia servir uma versão em cache anterior à mudança.
      await page.goto(`/buscar?bairro=${encodeURIComponent('Manilha')}`)
      // "Destaque" é irmão dos links dentro do card, não filho deles — o
      // card inteiro é o `div.entrada-lista` que envolve tudo.
      const primeiroCard = page.locator('div.entrada-lista').first()
      await expect(primeiroCard.getByText('Destaque')).toBeVisible({ timeout: 10000 })
      await expect(primeiroCard.getByRole('heading', { name: NEGOCIO_TESTE.nome })).toBeVisible()
    } finally {
      await admin.from('negocios').update({ destaque_ativo: false, destaque_expira_em: null }).eq('id', NEGOCIO_TESTE.negocioId)
    }
  })
})
