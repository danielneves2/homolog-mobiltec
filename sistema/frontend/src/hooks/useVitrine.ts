import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Categoria, Vitrine } from '@/lib/tipos'

/** Catálogo de modelos para a home — a mesma visão que o parceiro terá */
export function useVitrine() {
  return useQuery({
    queryKey: ['vitrine'],
    queryFn: () => api.get<Vitrine>('/vitrine'),
  })
}

/** Categorias em operação — monta o menu lateral */
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => api.get<Categoria[]>('/categorias'),
    staleTime: 5 * 60_000,
  })
}
