import { MailCheck } from 'lucide-react'

export default function PaginaConfirmeEmail() {
  return (
    <div className="rounded-casca border border-barro-100 bg-white p-8 text-center shadow-feira-lg">
      <MailCheck className="mx-auto h-12 w-12 text-mata-500" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-barro-900">Quase lá!</h1>
      <p className="mt-2 text-barro-600">
        Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.
      </p>
    </div>
  )
}
