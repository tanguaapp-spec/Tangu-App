import * as React from 'react'

/**
 * `cache` do React (memoriza por requisição no servidor). Fora do runtime de
 * Server Components (testes) ele não existe: aí vira a própria função.
 */
export const cacheRequisicao: <T extends (...args: never[]) => unknown>(fn: T) => T =
  (React as unknown as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)
