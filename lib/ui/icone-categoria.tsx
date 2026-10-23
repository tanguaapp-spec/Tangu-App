import {
  Baby,
  Bike,
  Briefcase,
  Cake,
  Car,
  Coffee,
  Dog,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  PartyPopper,
  Pill,
  Pizza,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sprout,
  Stethoscope,
  Store,
  Truck,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * `categorias.icone` guarda o nome do ícone em kebab-case (o mesmo do site
 * do Lucide). Mapa fechado de propósito: importar o pacote inteiro do
 * lucide colocava ~1.500 ícones no JavaScript de todas as telas. Ícone
 * fora da lista cai pra `Store` — pra usar outro, é só incluir aqui.
 */
const ICONES: Record<string, LucideIcon> = {
  baby: Baby,
  bike: Bike,
  briefcase: Briefcase,
  cake: Cake,
  car: Car,
  coffee: Coffee,
  dog: Dog,
  dumbbell: Dumbbell,
  'graduation-cap': GraduationCap,
  hammer: Hammer,
  'heart-pulse': HeartPulse,
  home: Home,
  laptop: Laptop,
  'party-popper': PartyPopper,
  pill: Pill,
  pizza: Pizza,
  scissors: Scissors,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  sprout: Sprout,
  stethoscope: Stethoscope,
  store: Store,
  truck: Truck,
  utensils: Utensils,
  wrench: Wrench,
}

export const ICONES_CATEGORIA = Object.keys(ICONES)

export function iconeCategoria(nomeIcone: string | null | undefined): LucideIcon {
  return (nomeIcone && ICONES[nomeIcone]) || Store
}
