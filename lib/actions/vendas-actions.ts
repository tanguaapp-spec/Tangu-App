'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { recursosDoNegocio } from '@/lib/planos/recursos'
import { lerPrecoCentavos } from '@/lib/admin/configuracoes'
import { urlNegocio } from '@/lib/ui/apresentacao'

/** Liga/desliga pedidos e agenda pelo WhatsApp e guarda as regras de entrega. */
export async function salvarVendasWhatsapp(formData: FormData) {
  const { negocio, papel } = await negocioDoPainel()
  if (!negocio) return { erro: 'Negócio não encontrado.' }
  if (papel === 'atendente') return { erro: 'Só dono ou gerente muda essas configurações.' }
  const { recursos } = await recursosDoNegocio(negocio.id)
  const querPedidos = formData.get('pedidos_whatsapp') === 'on'
  const querAgenda = formData.get('agenda_whatsapp') === 'on'
  if (querPedidos && !recursos.pedidos_whatsapp) return { erro: 'Pedidos pelo WhatsApp não fazem parte do seu plano.' }
  if (querAgenda && !recursos.agenda_whatsapp) return { erro: 'Agendamento pelo WhatsApp não faz parte do seu plano.' }
  if ((querPedidos || querAgenda) && !negocio.whatsapp) return { erro: 'Cadastre o WhatsApp do negócio no Perfil antes de ligar.' }

  const entrega = formData.get('entrega') === 'on'
  const retirada = formData.get('retirada') === 'on'
  if (querPedidos && !entrega && !retirada) return { erro: 'Marque entrega, retirada ou os dois.' }
  const taxa = lerPrecoCentavos(formData.get('taxa_entrega'))
  const minimo = lerPrecoCentavos(formData.get('pedido_minimo'))
  if (!Number.isFinite(taxa) || taxa < 0 || !Number.isFinite(minimo) || minimo < 0) return { erro: 'Confira os valores de taxa e pedido mínimo.' }

  const { error } = await createClient()
    .from('negocios')
    .update({
      pedidos_whatsapp: querPedidos,
      agenda_whatsapp: querAgenda,
      config_pedidos: {
        entrega,
        retirada,
        taxa_entrega_centavos: taxa,
        pedido_minimo_centavos: minimo,
        observacao: String(formData.get('observacao') ?? '').trim().slice(0, 200),
      },
    })
    .eq('id', negocio.id)
  if (error) return { erro: 'Não foi possível salvar agora.' }
  revalidatePath('/painel/negocio/vendas')
  revalidatePath(urlNegocio(negocio))
  return { erro: null }
}
