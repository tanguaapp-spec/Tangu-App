import * as LucideIcons from 'lucide-react'
import { Store, type LucideIcon } from 'lucide-react'

/**
 * `categorias.icone` guarda o nome do ícone em kebab-case (ex: "heart-pulse"),
 * o mesmo formato usado pelo próprio site do Lucide — aqui a gente resolve
 * pro componente React de verdade. Cai pra `Store` se o nome não existir
 * (categoria nova sem ícone cadastrado, ou erro de digitação no banco).
 */
export function iconeCategoria(nomeIcone: string | null | undefined): LucideIcon {
  if (!nomeIcone) return Store
  const pascalCase = nomeIcone
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('')
  const Icone = (LucideIcons as unknown as Record<string, LucideIcon>)[pascalCase]
  return Icone ?? Store
}
