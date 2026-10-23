import { createServiceClient } from '@/lib/supabase/server'

/**
 * E-mail transacional via Resend (https://resend.com). Sem RESEND_API_KEY
 * não faz nada (o app segue avisando pelo sino e pelo push). Só pra avisos
 * importantes de uma pessoa específica — nunca marketing em massa.
 *
 * Variáveis: RESEND_API_KEY e EMAIL_REMETENTE ("Tanguá App <avisos@seudominio>",
 * domínio verificado no Resend).
 */
export function emailConfigurado() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_REMETENTE
}

function escaparHtml(t: string) {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function montarEmail({ titulo, texto, botao, url }: { titulo: string; texto: string; botao?: string; url?: string }) {
  const corpo = escaparHtml(texto).replace(/\n/g, '<br>')
  const acao =
    botao && url
      ? `<p style="margin:24px 0"><a href="${escaparHtml(url)}" style="background:#F26A1B;color:#13241D;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block">${escaparHtml(botao)}</a></p>`
      : ''
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F4F6F1;font-family:Arial,sans-serif;color:#13241D">
<div style="max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:22px;font-weight:700;color:#0E4D3A;margin:0 0 16px">tanguá</p>
<div style="background:#fff;border-radius:20px;padding:24px;border:1px solid #DCE3DD">
<h1 style="font-size:20px;margin:0 0 12px">${escaparHtml(titulo)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0">${corpo}</p>${acao}
</div>
<p style="font-size:12px;color:#55655D;margin:16px 4px">Você recebe este e-mail por ter uma conta no Tanguá App. Pra mudar os avisos, abra Você → Comunicação no app.</p>
</div></body></html>`
}

/** Envia pra pessoas (pelo id do perfil). Falha em silêncio, só registra no log. */
export async function enviarEmailParaPerfis(perfilIds: string[], email: { assunto: string; titulo: string; texto: string; botao?: string; url?: string }) {
  if (!emailConfigurado() || perfilIds.length === 0) return 0
  const db = createServiceClient()
  let enviados = 0
  for (const id of Array.from(new Set(perfilIds)).slice(0, 50)) {
    try {
      const { data } = await db.auth.admin.getUserById(id)
      const para = data.user?.email
      if (!para) continue
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: [para], subject: email.assunto, html: montarEmail(email) }),
      })
      if (r.ok) enviados++
      else console.error('Resend recusou o e-mail:', r.status, await r.text().catch(() => ''))
    } catch (err) {
      console.error('Falha ao enviar e-mail:', err)
    }
  }
  return enviados
}
