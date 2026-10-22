/** GoTrue responde em inglês — traduz os casos comuns, o resto vira genérico. */
export function traduzirErroAuth(mensagem: string | undefined): string {
  const m = (mensagem ?? '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.'
  if (m.includes('password') && (m.includes('at least') || m.includes('short')))
    return 'A senha precisa ter pelo menos 8 caracteres.'
  if (m.includes('weak') || m.includes('pwned')) return 'Essa senha é fácil de adivinhar. Escolha outra.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Confira o e-mail digitado.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Aguarde alguns minutos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar — procure a mensagem na caixa de entrada ou spam.'
  if (m.includes('same password') || m.includes('different from the old'))
    return 'A nova senha precisa ser diferente da anterior.'
  return 'Não foi possível concluir agora. Tente de novo em instantes.'
}
