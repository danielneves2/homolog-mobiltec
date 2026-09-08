import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  DashboardHomologacao,
  Fonte,
  Homologacao,
  Justificativa,
  StatusHomologacao,
  TipoGerenciamento,
} from '@/lib/tipos'

export const chaves = {
  homologacao: (id: string) => ['homologacao', id] as const,
  dashboard: (id: string) => ['homologacao', id, 'dashboard'] as const,
  justificativas: (itemId: string, ger: TipoGerenciamento, android: number | null) =>
    ['justificativas', itemId, ger, android] as const,
}

export function useHomologacao(id: string, opcoes?: { habilitado?: boolean }) {
  const habilitado = (opcoes?.habilitado ?? true) && id !== ''
  return useQuery({
    queryKey: chaves.homologacao(id),
    enabled: habilitado,
    queryFn: () => api.get<Homologacao>(`/homologacoes/${id}`),
  })
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: chaves.dashboard(id),
    queryFn: () => api.get<DashboardHomologacao>(`/homologacoes/${id}/dashboard`),
  })
}

/** Justificativas sugeridas para um item, filtradas por Android + gerenciamento (spec §10.4) */
export function useJustificativasSugeridas(
  itemId: string | null,
  gerenciamento: TipoGerenciamento,
  androidMin: number | null,
) {
  return useQuery({
    queryKey: chaves.justificativas(itemId ?? '', gerenciamento, androidMin),
    enabled: itemId !== null,
    queryFn: () =>
      api.get<Justificativa[]>('/justificativas', {
        itemId: itemId!,
        gerenciamento,
        androidMin,
      }),
  })
}

/**
 * Muda o status da homologação (finalizar, aprovar…).
 *
 * Invalida a matriz junto: o cabeçalho da coluna troca "Finalizar" por
 * "Reabrir" conforme o status, e sem isso a UI ficaria mostrando o estado
 * antigo mesmo com o banco já atualizado.
 */
export function useTransicaoStatus(homologacaoId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: { novoStatus: StatusHomologacao; homologado?: boolean }) =>
      api.post<Homologacao>(`/homologacoes/${homologacaoId}/status`, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.homologacao(homologacaoId) })
      qc.invalidateQueries({ queryKey: chaves.dashboard(homologacaoId) })
      qc.invalidateQueries({ queryKey: ['matriz'] })
      // Aprovar congela o certificado e reabrir o descongela — os dois mudam
      // o que a prévia desenha e se o painel aceita edição
      qc.invalidateQueries({ queryKey: ['certificado'] })
      qc.invalidateQueries({ queryKey: ['analise-divergencias'] })
    },
  })
}

export function useReabrir(homologacaoId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (motivo: string) =>
      api.post<{ mensagem: string; logId: string }>(`/homologacoes/${homologacaoId}/reabrir`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.homologacao(homologacaoId) })
      qc.invalidateQueries({ queryKey: chaves.dashboard(homologacaoId) })
      qc.invalidateQueries({ queryKey: ['matriz'] })
      // Aprovar congela o certificado e reabrir o descongela — os dois mudam
      // o que a prévia desenha e se o painel aceita edição
      qc.invalidateQueries({ queryKey: ['certificado'] })
      qc.invalidateQueries({ queryKey: ['analise-divergencias'] })
    },
  })
}

export interface DadosCertificado {
  fontes?: Fonte[]
  assinaturaResponsavel?: string | null
  assinaturaGerente?: string | null
  assinaturaApoio?: string | null
}

/**
 * Edita fontes e assinaturas do certificado (spec §8.3) — painel da tela de
 * certificado. Invalida o preview além da própria homologação, já que o
 * documento é gerado a partir desses dois campos.
 */
export function useSalvarDadosCertificado(homologacaoId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (dados: DadosCertificado) =>
      api.patch<Homologacao>(`/homologacoes/${homologacaoId}`, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.homologacao(homologacaoId) })
      qc.invalidateQueries({ queryKey: ['certificado', homologacaoId, 'preview'] })
    },
  })
}

/**
 * Edita o texto de uma divergência direto do certificado (lápis do preview).
 * Grava como `justificativaTexto` — override da justificativa da biblioteca
 * (spec §4.2) — em todos os itens que dividem o parágrafo.
 */
export function useEditarDivergencia(homologacaoId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: { itemIds: string[]; texto: string }) =>
      api.put<{ atualizados: number }>(`/homologacoes/${homologacaoId}/certificado/divergencia`, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.homologacao(homologacaoId) })
      qc.invalidateQueries({ queryKey: ['certificado', homologacaoId, 'preview'] })
      // A matriz mostra a justificativa no tooltip da célula
      qc.invalidateQueries({ queryKey: ['matriz'] })
    },
  })
}

/** Salva um texto livre recorrente como justificativa reutilizável (spec §10.4) */
export function useSalvarNaBiblioteca() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: {
      titulo: string
      texto: string
      itensSugeridos: string[]
      androidMin: number | null
      gerenciamento: TipoGerenciamento | null
    }) => api.post<Justificativa>('/justificativas', { ...p, fontes: [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['justificativas'] })
    },
  })
}
