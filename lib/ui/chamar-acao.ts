/** Mensagem quando a ação não responde (sem internet, servidor reiniciando, envio grande demais). */
export const SEM_RESPOSTA = 'Não foi possível concluir agora. Confira a internet e tente de novo. Se enviou uma foto, tente uma menor.'

/**
 * Chama uma server action sem deixar a tela quebrar: se a resposta vier
 * vazia ou a chamada falhar no caminho, devolve { erro } com a mensagem
 * acima (antes, "r.erro" em resposta vazia derrubava a página inteira).
 */
export async function chamarAcao<T>(promessa: Promise<T>): Promise<T> {
  try {
    const r = await promessa
    return (r ?? { erro: SEM_RESPOSTA }) as T
  } catch (err) {
    // redirect() do Next também chega como exceção: deixa seguir
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw err
    return { erro: SEM_RESPOSTA } as T
  }
}
