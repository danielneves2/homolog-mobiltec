import type { QueryClient } from '@tanstack/react-query'

/**
 * Tudo o que é montado a partir das homologações (D510). Matriz, painel do
 * parceiro, Painel Mobiltec, validação, ficha e certificado leem os mesmos
 * registros — mudou um, os outros têm de refletir na próxima vez que
 * aparecerem, sem esperar o `staleTime`.
 */
const VISOES_DA_PLANILHA = [
  ['matriz'],
  ['painel-parceiro'],
  ['vitrine'],
  ['homologacoes'],
  ['homologacoes-finalizadas'],
  ['homologacao'],
  ['dispositivos'],
  ['dispositivo'],
  ['certificado'],
  ['analise-divergencias'],
] as const

/** O que só muda quando uma homologação nasce, sai ou troca de status */
const VISOES_DA_ESTRUTURA = [['parceiros'], ['notificacoes'], ['categorias']] as const

/**
 * Marca as visões da planilha como desatualizadas; as abertas recarregam já.
 * `estrutura`: também contagens de tipo, lista de parceiros e notificações —
 * para cadastro, remoção e mudança de status, não para cada célula.
 */
export function sincronizarPlanilha(qc: QueryClient, { estrutura = false } = {}) {
  const chaves = estrutura ? [...VISOES_DA_PLANILHA, ...VISOES_DA_ESTRUTURA] : VISOES_DA_PLANILHA
  for (const queryKey of chaves) qc.invalidateQueries({ queryKey })
}
