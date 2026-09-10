/**
 * Máquina de estados de homologação e validação de transições por papel.
 *
 * FONTE CANÔNICA — toda lógica de transição deve importar deste módulo.
 * Se novas transições forem adicionadas, atualizar apenas este arquivo.
 */
import type { StatusHomologacao } from '@prisma/client'

/**
 * Mapa de transições de status permitidas para usuários Mobiltec (ADMIN/HOMOLOGADOR).
 * Parceiros possuem regra própria mais restritiva (apenas RASCUNHO → AGUARDANDO_ANALISE).
 */
export const TRANSICOES_PERMITIDAS: Partial<Record<StatusHomologacao, StatusHomologacao[]>> = {
  RASCUNHO: ['EM_REVISAO', 'AGUARDANDO_ANALISE'] as StatusHomologacao[],
  AGUARDANDO_ANALISE: ['EM_REVISAO', 'APROVADO', 'REPROVADO', 'RASCUNHO'] as StatusHomologacao[],
  EM_REVISAO: ['APROVADO', 'REPROVADO', 'RASCUNHO', 'AGUARDANDO_ANALISE'] as StatusHomologacao[],
  APROVADO: ['PUBLICADO', 'RASCUNHO'] as StatusHomologacao[],
  REPROVADO: ['RASCUNHO'] as StatusHomologacao[],
}

/**
 * Valida se uma transição de status é permitida para o papel informado.
 *
 * @returns `{ permitida: true }` ou `{ permitida: false, erro: string }`
 */
export function validarTransicao(
  papel: string,
  statusAtual: string,
  novoStatus: string,
): { permitida: true } | { permitida: false; erro: string } {
  // Leitor: estritamente somente-leitura — nenhuma transição permitida
  if (papel === 'LEITOR') {
    return {
      permitida: false,
      erro: 'Usuários com perfil Leitor não possuem permissão para alterar o status de homologações.',
    }
  }

  // Parceiro: regra estrita — só RASCUNHO → AGUARDANDO_ANALISE
  if (papel === 'PARCEIRO') {
    if (statusAtual !== 'RASCUNHO' || novoStatus !== 'AGUARDANDO_ANALISE') {
      return {
        permitida: false,
        erro: 'Parceiros só possuem permissão para submeter homologações em rascunho para Aguardando Análise.',
      }
    }
    return { permitida: true }
  }

  // Mobiltec (ADMIN / HOMOLOGADOR): consulta o mapa de transições
  if (papel === 'ADMIN' || papel === 'HOMOLOGADOR') {
    const permitidas = TRANSICOES_PERMITIDAS[statusAtual as StatusHomologacao] ?? []
    if (!permitidas.includes(novoStatus as StatusHomologacao)) {
      return {
        permitida: false,
        erro: `Transição inválida: ${statusAtual} → ${novoStatus}`,
      }
    }
    return { permitida: true }
  }

  return {
    permitida: false,
    erro: `Papel '${papel}' não possui permissão para transicionar status.`,
  }
}
