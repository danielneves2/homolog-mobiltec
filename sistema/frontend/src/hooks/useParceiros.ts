import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Parceiro, PayloadCriarParceiro, PayloadAtualizarParceiro, PainelParceiroDados } from '@/lib/tipos'

export const chavesParceiros = {
  todas: ['parceiros'] as const,
  painel: (id?: string) => ['painel-parceiro', id ?? 'meu'] as const,
}

export function useParceiros(habilitado = true) {
  return useQuery({
    queryKey: chavesParceiros.todas,
    queryFn: () => api.get<Parceiro[]>('/parceiros'),
    enabled: habilitado,
  })
}

export function usePainelParceiro(parceiroId?: string) {
  return useQuery({
    queryKey: chavesParceiros.painel(parceiroId),
    queryFn: () =>
      parceiroId
        ? api.get<PainelParceiroDados>(`/parceiros/${parceiroId}/painel`)
        : api.get<PainelParceiroDados>('/parceiros/meu-painel'),
  })
}

export function useCriarParceiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: PayloadCriarParceiro) => api.post<Parceiro>('/parceiros', dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesParceiros.todas })
    },
  })
}

export function useAtualizarParceiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dados }: { id: string } & PayloadAtualizarParceiro) =>
      api.put<Parceiro>(`/parceiros/${id}`, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesParceiros.todas })
      qc.invalidateQueries({ queryKey: ['painel-parceiro'] })
    },
  })
}

export function useInativarParceiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/parceiros/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesParceiros.todas })
      qc.invalidateQueries({ queryKey: ['painel-parceiro'] })
    },
  })
}
