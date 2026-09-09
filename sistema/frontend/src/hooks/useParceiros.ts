import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Parceiro, PayloadCriarParceiro, PayloadAtualizarParceiro } from '@/lib/tipos'

export const chavesParceiros = {
  todas: ['parceiros'] as const,
}

export function useParceiros() {
  return useQuery({
    queryKey: chavesParceiros.todas,
    queryFn: () => api.get<Parceiro[]>('/parceiros'),
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
    },
  })
}

export function useInativarParceiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/parceiros/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesParceiros.todas })
    },
  })
}
