// Gera app/tema.css a partir de lib/tema/paleta.ts. Rode: npm run tema
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { gerarCssTema } from '../lib/tema/paleta'

const destino = path.resolve(__dirname, '..', 'app', 'tema.css')
writeFileSync(destino, gerarCssTema())
console.log('app/tema.css atualizado')
