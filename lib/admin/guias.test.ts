import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FLUXOS, GUIAS, type ChaveGuia } from './guias'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'
import PaginaComoFunciona from '@/app/painel/admin/como-funciona/page'

const existePagina = (href: string) => fs.existsSync(path.join(process.cwd(), 'app', href.split('#')[0], 'page.tsx'))

describe('guias do painel admin', () => {
  it('cada guia aponta para uma aba que existe e tem conteúdo', () => {
    for (const g of Object.values(GUIAS)) {
      expect(existePagina(g.href), g.href).toBe(true)
      expect(g.resumo.length).toBeGreaterThan(20)
      expect(g.sozinho.length + g.voces.length).toBeGreaterThan(1)
    }
  })

  it('cada processo leva a uma aba que existe', () => {
    for (const f of FLUXOS) expect(existePagina(f.onde.href), f.onde.href).toBe(true)
  })

  it('todas as abas do admin mostram o quadro "Como funciona"', () => {
    const pasta = path.join(process.cwd(), 'app/painel/admin')
    const semGuia = ['cartaz', 'como-funciona', 'crescimento', 'leads'] // leads e crescimento: no componente compartilhado
    for (const d of fs.readdirSync(pasta, { withFileTypes: true })) {
      if (!d.isDirectory() || semGuia.includes(d.name)) continue
      const arquivo = path.join(pasta, d.name, 'page.tsx')
      expect(fs.readFileSync(arquivo, 'utf8'), d.name).toContain('<GuiaPagina')
    }
  })

  it('o quadro renderiza com e sem link para o manual', () => {
    for (const chave of Object.keys(GUIAS) as ChaveGuia[]) {
      const html = renderToStaticMarkup(createElement(GuiaPagina, { chave }))
      expect(html).toContain('Como funciona esta tela')
      expect(html).toContain('/painel/admin/como-funciona')
    }
    expect(renderToStaticMarkup(createElement(GuiaPagina, { chave: 'leads', semManual: true }))).not.toContain('/painel/admin/como-funciona')
  })

  it('a página "Como o app funciona" lista processos, rotinas e abas', () => {
    const html = renderToStaticMarkup(createElement(PaginaComoFunciona))
    for (const f of FLUXOS) expect(html).toContain(f.titulo.replace(/"/g, '&quot;'))
    expect(html).toContain('Tarefas automáticas de todo dia')
    expect(html).toContain(GUIAS.usuarios.resumo)
  })
})
