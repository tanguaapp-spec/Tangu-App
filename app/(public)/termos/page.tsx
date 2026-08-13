import Link from 'next/link'
import { FileText } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso — Tanguá App',
  description: 'Regras de uso do Tanguá App para moradores e profissionais de Tanguá-RJ.',
}

export const revalidate = 3600

const ATUALIZADO_EM = '13 de agosto de 2026'

export default function PaginaTermos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-casca-100 px-3 py-1 text-sm font-semibold text-casca-700">
        <FileText className="h-3.5 w-3.5" /> Regras de uso
      </span>
      <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-barro-900 sm:text-4xl">
        Termos de Uso
      </h1>
      <p className="mt-2 text-sm text-barro-500">Última atualização: {ATUALIZADO_EM}</p>

      <div className="mt-8 space-y-8 text-barro-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-barro-900 [&_p]:mt-2 [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:leading-relaxed">
        <section>
          <p>
            Ao criar uma conta ou usar o <strong>Tanguá App</strong>, você concorda com estas regras. Leia com
            atenção — escrevemos em linguagem simples, sem juridiquês desnecessário. Veja também nossa{' '}
            <Link href="/privacidade" className="font-medium text-casca-600 hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>1. O que é o Tanguá App</h2>
          <p>
            É um diretório e mural comunitário de Tanguá-RJ que conecta moradores a profissionais e comércios
            locais — com loja física, atendimento em casa, atendimento a domicílio ou serviço 100% digital — e
            reúne avisos, eventos e vagas de emprego da cidade.
          </p>
          <p>
            O Tanguá App <strong>não é parte</strong> em nenhuma negociação, compra, serviço ou contrato entre
            morador e profissional — apenas facilita o contato. Combinações de preço, prazo, qualidade e
            pagamento são sempre diretamente entre as partes, geralmente pelo WhatsApp.
          </p>
        </section>

        <section>
          <h2>2. Quem pode usar</h2>
          <p>
            Pessoas com 18 anos ou mais, residentes ou com interesse em Tanguá-RJ e região. Cada pessoa pode ter
            apenas uma conta, com informações verdadeiras.
          </p>
        </section>

        <section>
          <h2>3. Cadastro de negócio</h2>
          <ul>
            <li>Todo cadastro feito diretamente por um profissional passa por análise da nossa equipe antes de aparecer no diretório.</li>
            <li>Você é responsável pela veracidade dos dados do seu negócio (endereço, contato, horário, fotos, preços).</li>
            <li>A &ldquo;forma de atendimento&rdquo; (loja física, atende em casa, vai até o cliente ou serviço digital) deve refletir a realidade do seu negócio.</li>
            <li>Reivindicar um perfil já existente (importado do Google) exige comprovar que você é o responsável pelo negócio.</li>
            <li>Podemos recusar ou remover um cadastro que viole estes termos, contenha informação falsa ou conteúdo ofensivo/ilegal.</li>
          </ul>
        </section>

        <section>
          <h2>4. Avaliações, mural e conteúdo enviado por usuários</h2>
          <ul>
            <li>Avaliações devem refletir uma experiência real com o negócio avaliado.</li>
            <li>É proibido publicar conteúdo ofensivo, discriminatório, falso, ilegal ou que viole direitos de terceiros — em avaliações, perguntas no mural ou qualquer outro campo de texto/imagem.</li>
            <li>Qualquer usuário pode denunciar conteúdo que viole estas regras; nossa equipe analisa e pode remover o conteúdo e, em caso de reincidência, suspender a conta responsável.</li>
            <li>O profissional pode responder publicamente a avaliações do seu negócio.</li>
          </ul>
        </section>

        <section>
          <h2>5. Moeda &ldquo;Laranjas&rdquo;, cartão fidelidade e cupons</h2>
          <p>
            &ldquo;Laranjas&rdquo; são pontos de reconhecimento dentro do app (sem conversão em dinheiro), ganhos ao
            avaliar, favoritar, completar o perfil ou indicar vizinhos. O cartão fidelidade e os cupons de cada
            negócio são configurados e cumpridos diretamente pelo profissional — o Tanguá App registra o
            progresso, mas a validação do prêmio é combinada entre você e o profissional.
          </p>
        </section>

        <section>
          <h2>6. Destaque pago</h2>
          <p>
            Profissionais podem solicitar destaque no diretório mediante contato comercial pelo WhatsApp. A
            ativação é feita manualmente pela nossa equipe após a confirmação do pagamento, combinado
            diretamente com o profissional.
          </p>
        </section>

        <section>
          <h2>7. Notificações</h2>
          <p>
            Se você ativar notificações push, pode recebê-las sobre novidades do seu bairro, aprovação de
            cadastro, resposta a reivindicação, entre outras. Você pode desativá-las a qualquer momento nas
            configurações do navegador ou do seu perfil.
          </p>
        </section>

        <section>
          <h2>8. Suspensão e encerramento de conta</h2>
          <p>
            Podemos suspender ou encerrar contas que violem estes termos, usem o app para fins fraudulentos, ou
            publiquem conteúdo denunciado e confirmado como abusivo. Você pode encerrar sua conta a qualquer
            momento entrando em contato pelo WhatsApp no rodapé do app.
          </p>
        </section>

        <section>
          <h2>9. Limitação de responsabilidade</h2>
          <p>
            O Tanguá App faz o possível para manter o diretório atualizado e confiável, mas não garante a
            exatidão de informações fornecidas por terceiros (profissionais, avaliações de usuários) nem se
            responsabiliza por prejuízos decorrentes de negociações feitas fora da plataforma.
          </p>
        </section>

        <section>
          <h2>10. Alterações destes termos</h2>
          <p>
            Podemos atualizar estes termos conforme o app evolui. A data no topo desta página sempre indica a
            versão mais recente. O uso continuado do app após uma atualização representa concordância com os
            novos termos.
          </p>
        </section>

        <section>
          <h2>11. Contato</h2>
          <p>
            Dúvidas sobre estes termos?{' '}
            <a
              href="https://wa.me/5521972652314?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20os%20Termos%20de%20Uso%20do%20Tangu%C3%A1%20App."
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-casca-600 hover:underline"
            >
              Fale com a gente no WhatsApp
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
