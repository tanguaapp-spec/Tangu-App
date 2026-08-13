import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade — Tanguá App',
  description: 'Como o Tanguá App coleta, usa e protege os dados de moradores e profissionais de Tanguá-RJ.',
}

export const revalidate = 3600

const ATUALIZADO_EM = '13 de agosto de 2026'

export default function PaginaPrivacidade() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mata-100 px-3 py-1 text-sm font-semibold text-mata-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Compromisso com a LGPD
      </span>
      <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-barro-900 sm:text-4xl">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-barro-500">Última atualização: {ATUALIZADO_EM}</p>

      <div className="mt-8 space-y-8 text-barro-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-barro-900 [&_p]:mt-2 [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:leading-relaxed">
        <section>
          <p>
            Esta política explica, em linguagem simples, o que o <strong>Tanguá App</strong> faz com os dados
            de quem usa o aplicativo — morador ou profissional/comércio de Tanguá-RJ — em conformidade com a
            Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
          </p>
        </section>

        <section>
          <h2>1. Quem somos</h2>
          <p>
            O Tanguá App é um diretório e mural comunitário de Tanguá-RJ, operado de forma independente.
            Para dúvidas sobre esta política ou sobre seus dados, fale com a gente pelo{' '}
            <a
              href="https://wa.me/5521972652314?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20privacidade%20de%20dados%20no%20Tangu%C3%A1%20App."
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-casca-600 hover:underline"
            >
              WhatsApp
            </a>
            .
          </p>
        </section>

        <section>
          <h2>2. Quais dados coletamos</h2>
          <p>Coletamos apenas o que é necessário para o app funcionar:</p>
          <ul>
            <li><strong>Cadastro:</strong> nome completo, e-mail, telefone/WhatsApp e senha (armazenada de forma criptografada, nunca em texto puro).</li>
            <li><strong>Perfil:</strong> bairro, foto de avatar (opcional).</li>
            <li><strong>Negócio (para profissionais):</strong> nome do negócio, categoria, descrição, endereço, telefone, WhatsApp, redes sociais, horário de funcionamento, fotos, formas de pagamento e forma de atendimento.</li>
            <li><strong>Interações:</strong> avaliações e fotos enviadas em avaliações, favoritos, perguntas e reações no mural, denúncias de conteúdo.</li>
            <li><strong>Notificações:</strong> se você ativar notificações push, guardamos um identificador técnico do seu navegador/dispositivo (nunca conteúdo das notificações em si).</li>
            <li><strong>Uso técnico:</strong> registros de erro do sistema (para corrigir falhas), sem finalidade de perfilamento ou publicidade.</li>
          </ul>
          <p>
            <strong>Não coletamos localização por GPS, não vendemos dados a terceiros e não usamos seus dados
            para anúncios de terceiros.</strong>
          </p>
        </section>

        <section>
          <h2>3. Por que coletamos (base legal e finalidade)</h2>
          <ul>
            <li><strong>Execução do serviço</strong> (art. 7º, V, LGPD): criar sua conta, exibir o diretório, permitir avaliações, favoritos e contato via WhatsApp.</li>
            <li><strong>Consentimento</strong> (art. 7º, I): envio de notificações push e resumo diário do bairro — sempre com opção de desativar.</li>
            <li><strong>Legítimo interesse</strong> (art. 7º, IX): prevenção a fraude e abuso (limite de tentativas de login/cadastro, moderação de conteúdo denunciado).</li>
          </ul>
        </section>

        <section>
          <h2>4. Com quem compartilhamos</h2>
          <p>Seus dados não são vendidos. Compartilhamos apenas com prestadores que operam a infraestrutura do app:</p>
          <ul>
            <li><strong>Supabase</strong> — banco de dados, autenticação e armazenamento de imagens.</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
            <li>
              Quando você clica para falar com um profissional no <strong>WhatsApp</strong>, a conversa passa a
              ser diretamente entre vocês dois, fora do Tanguá App.
            </li>
          </ul>
          <p>
            Dados de perfil de negócio (nome, endereço, avaliações) são públicos por natureza — é o objetivo do
            diretório. Dados pessoais de moradores (e-mail, telefone) nunca aparecem publicamente sem sua ação
            (ex.: você mesmo enviando seu WhatsApp numa mensagem).
          </p>
        </section>

        <section>
          <h2>5. Por quanto tempo guardamos</h2>
          <p>
            Enquanto sua conta existir. Se você pedir a exclusão da conta, removemos seus dados pessoais em até
            15 dias, exceto o que a lei exigir manter por mais tempo (ex.: obrigações fiscais, caso existam).
          </p>
        </section>

        <section>
          <h2>6. Seus direitos como titular dos dados</h2>
          <p>Nos termos do art. 18 da LGPD, você pode a qualquer momento:</p>
          <ul>
            <li>Confirmar se tratamos seus dados e acessá-los;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados (direto em <Link href="/perfil" className="font-medium text-casca-600 hover:underline">Meu perfil</Link>);</li>
            <li>Pedir a exclusão da sua conta e dos dados associados;</li>
            <li>Revogar o consentimento de notificações a qualquer momento (nas configurações do navegador ou em <Link href="/perfil" className="font-medium text-casca-600 hover:underline">Meu perfil</Link>);</li>
            <li>Solicitar a portabilidade dos seus dados.</li>
          </ul>
          <p>
            Para exercer qualquer um desses direitos, fale com a gente pelo{' '}
            <a
              href="https://wa.me/5521972652314?text=Ol%C3%A1!%20Quero%20exercer%20um%20direito%20sobre%20meus%20dados%20no%20Tangu%C3%A1%20App."
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-casca-600 hover:underline"
            >
              WhatsApp
            </a>
            .
          </p>
        </section>

        <section>
          <h2>7. Segurança</h2>
          <p>
            Usamos conexão criptografada (HTTPS) em todo o app, controle de acesso por linha (RLS) no banco de
            dados — cada pessoa só acessa o que tem permissão — e limite de tentativas para prevenir ataques de
            força bruta em login e cadastro.
          </p>
        </section>

        <section>
          <h2>8. Crianças e adolescentes</h2>
          <p>O Tanguá App não é direcionado a menores de 18 anos e não coleta dados intencionalmente desse público.</p>
        </section>

        <section>
          <h2>9. Alterações desta política</h2>
          <p>
            Podemos atualizar esta política conforme o app evolui. A data no topo desta página sempre indica a
            versão mais recente.
          </p>
        </section>
      </div>
    </div>
  )
}
