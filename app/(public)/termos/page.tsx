import Link from 'next/link'
import { FileText } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso — Tanguá App',
  description: 'Regras de uso do Tanguá App para moradores e profissionais de Tanguá-RJ.',
}

export const revalidate = 3600

const ATUALIZADO_EM = '22 de outubro de 2026'

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
            <li>O cadastro feito pelo próprio profissional entra no ar na hora. Verificações automáticas podem segurar um cadastro para revisão humana (por exemplo, termos sinalizados ou volume incomum de cadastros).</li>
            <li>Profissional autônomo não precisa informar endereço residencial; basta a área onde atende.</li>
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
            <li>O profissional pode responder publicamente a avaliações do seu negócio, mas não pode alterar a nota nem o texto de quem avaliou.</li>
            <li>Quando um conteúdo seu for removido pela moderação, você recebe um aviso com o motivo e pode contestar pela central de ajuda.</li>
          </ul>
        </section>

        <section>
          <h2>5. Moeda &ldquo;Laranjas&rdquo;, cartão fidelidade e cupons</h2>
          <p>
            &ldquo;Laranjas&rdquo; são pontos de reconhecimento dentro do app (sem conversão em dinheiro), ganhos ao
            avaliar, favoritar, completar o perfil ou indicar vizinhos. O cartão fidelidade e os cupons de cada
            negócio são configurados e cumpridos diretamente pelo profissional — o Tanguá App registra o
            progresso, mas a validação do prêmio é combinada entre você e o profissional. Cupons com código
            valem uma única vez e só dentro do prazo e das condições informadas pelo negócio, que é o
            responsável por honrá-los.
          </p>
        </section>

        <section>
          <h2>6. Planos pagos</h2>
          <ul>
            <li>O plano Gratuito não tem custo. Planos pagos têm cobrança mensal recorrente pelo Mercado Pago, nos valores e limites exibidos em <Link href="/planos" className="font-medium text-casca-600 hover:underline">Planos</Link> no momento da contratação.</li>
            <li>O plano só é liberado depois que o Mercado Pago confirma a cobrança.</li>
            <li>Você pode trocar de plano ou cancelar a qualquer momento pelo painel, sem multa. Ao cancelar, o plano vale até o fim do período já pago.</li>
            <li>Se uma cobrança for recusada, os recursos pagos continuam por um período de tolerância informado no painel; depois o negócio volta ao Gratuito.</li>
            <li>Ao voltar ao Gratuito nada é apagado; apenas a criação de novos itens acima do limite fica bloqueada.</li>
            <li>O plano Destaque coloca o negócio em posição de destaque, sinalizada como tal. Planos pagos não garantem vendas nem resultados.</li>
            <li>Mudanças de preço valem só para novas contratações.</li>
          </ul>
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
            publiquem conteúdo denunciado e confirmado como abusivo. Você pode excluir sua conta a qualquer
            momento em Meu perfil → Privacidade e dados; a assinatura, se houver, é cancelada junto.
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
