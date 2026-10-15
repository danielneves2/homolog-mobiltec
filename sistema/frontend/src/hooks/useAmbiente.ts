import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AmbienteParceiroDados, ColaboradorAmbiente } from '@/lib/tipos'

/** D500: configuração do ambiente do parceiro (matrizes visíveis e colaboradores) */
export const chaveAmbiente = ['ambiente-parceiro'] as const

export function useAmbiente(habilitado = true) {
  return useQuery({
    queryKey: chaveAmbiente,
    queryFn: () => api.get<AmbienteParceiroDados>('/ambiente'),
    enabled: habilitado,
  })
}

export function useSalvarMatrizesOcultas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ocultas: string[]) => api.put<{ ocultas: string[] }>('/ambiente/categorias-ocultas', { ocultas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaveAmbiente })
      qc.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useConvidarColaborador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: { nome: string; email: string; senha: string }) =>
      api.post<ColaboradorAmbiente>('/ambiente/colaboradores', dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveAmbiente }),
  })
}

export function useAlterarColaborador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      api.patch<ColaboradorAmbiente>(`/ambiente/colaboradores/${id}`, { ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveAmbiente }),
  })
}
