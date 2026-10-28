import type { Categoria } from '@/lib/types/database'

/**
 * <option>s de categoria agrupados: cada principal com as subcategorias
 * embaixo (Beleza e estética → Barbearias, Salões…). Principal sem filhas
 * vira uma opção simples.
 */
export function OpcoesCategoria({ categorias }: { categorias: Categoria[] }) {
  const ativas = categorias.filter((c) => c.ativo !== false)
  const principais = ativas.filter((c) => !c.parent_id)
  return (
    <>
      {principais.map((m) => {
        const filhas = ativas.filter((c) => c.parent_id === m.id)
        if (!filhas.length)
          return (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          )
        return (
          <optgroup key={m.id} label={m.nome}>
            <option value={m.id}>{m.nome} (geral)</option>
            {filhas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}
