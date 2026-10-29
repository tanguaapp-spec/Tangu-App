/** Mensagem quando a ação não responde (sem internet, servidor reiniciando, envio grande demais). */
export const SEM_RESPOSTA = 'Não foi possível concluir agora. Confira a internet e tente de novo. Se enviou uma foto, tente uma menor.'

/**
 * Chama uma server action sem deixar a tela quebrar: se a resposta vier
 * vazia ou a chamada falhar no caminho, devolve { erro } com a mensagem
 * acima (antes, "r.erro" em resposta vazia derrubava a página inteira).
 *
 * `redireciona`: para ações que, dando certo, terminam em redirect() (entrar,
 * cadastrar…). No Next 14 elas voltam vazias para a tela enquanto a navegação
 * acontece; isso é sucesso, não falha, então não mostra erro nem vai pros Logs.
 */
export async function chamarAcao<T>(promessa: Promise<T>, opcoes?: { redireciona?: boolean }): Promise<T> {
  try {
    const r = await promessa
    if (r == null && opcoes?.redireciona) return {} as T
    if (r == null) avisarLogs('A ação do servidor voltou sem resposta')
    return (r ?? { erro: SEM_RESPOSTA }) as T
  } catch (err) {
    // redirect() do Next também chega como exceção: deixa seguir
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw err
    avisarLogs(`Falha ao chamar o servidor: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined)
    return { erro: SEM_RESPOSTA } as T
  }
}

/** Vai pros Logs do admin como aviso (sem internet não conta: não é bug). */
function avisarLogs(mensagem: string, stack?: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  import('@/components/layout/capturar-erros').then((m) => m.reportarErroNavegador(mensagem, stack, 'acao_sem_resposta')).catch(() => undefined)
}
