import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Dispositivo,
  Homologacao,
  Matriz,
  ResultadoMatriz,
  StatusResultado,
  TipoGerenciamento,
} from '@/lib/tipos'

export const chavesMatriz = {
  matriz: (slug: string) => ['matriz', slug] as const,
}

export function useMatriz(categoriaSlug = 'pos') {
  return useQuery({
    queryKey: chavesMatriz.matriz(categoriaSlug),
    queryFn: () => api.get<Matriz>('/matriz', { categoriaSlug }),
  })
}

interface PayloadCelula {
  homologacaoId: string
  itemId: string
  status: StatusResultado
  observacao?: string | null
  justificativaId?: string | null
  justificativaTexto?: string | null
}

/**
 * Edição de célula com update otimista — mesma ideia do checklist, mas o cache
 * a atualizar é o da matriz inteira.
 */
export function useSalvarCelula(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: PayloadCelula) =>
      api.put<ResultadoMatriz>(`/homologacoes/${p.homologacaoId}/resultados/${p.itemId}`, {
        status: p.status,
        observacao: p.observacao ?? null,
        justificativaId: p.justificativaId ?? null,
        justificativaTexto: p.justificativaTexto ?? null,
      }),

    onMutate: async (p) => {
      const chave = chavesMatriz.matriz(categoriaSlug)
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<Matriz>(chave)

      qc.setQueryData<Matriz>(chave, (velho) => {
        if (!velho) return velho
        return {
          ...velho,
          colunas: velho.colunas.map((c) => {
            if (c.homologacao.id !== p.homologacaoId) return c
            const atualizado = {
              ...c.homologacao.resultadosPorItem[p.itemId],
              status: p.status,
              observacao: p.observacao ?? null,
              justificativaId: p.justificativaId ?? null,
              justificativaTexto: p.justificativaTexto ?? null,
            }
            return {
              ...c,
              homologacao: {
                ...c.homologacao,
                resultadosPorItem: {
                  ...c.homologacao.resultadosPorItem,
                  [p.itemId]: atualizado,
                },
              },
            }
          }),
        }
      })

      return { anterior }
    },

    onError: (_e, _p, ctx) => {
      if (ctx?.anterior) qc.setQueryData(chavesMatriz.matriz(categoriaSlug), ctx.anterior)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
      // O certificado é HTML gerado no servidor a partir destes mesmos
      // resultados: a justificativa escrita aqui vira parágrafo da "Análise
      // das Divergências" lá. Sem invalidar, a prévia continua servindo o
      // documento anterior — o que parece que a justificativa não salvou.
      qc.invalidateQueries({ queryKey: ['certificado'] })
      qc.invalidateQueries({ queryKey: ['analise-divergencias'] })
    },
  })
}

/** Edita um campo da ficha (S/N, IMEI, versão do agente…) direto na matriz */
export function useSalvarFicha(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ homologacaoId, ...campos }: { homologacaoId: string } & Record<string, unknown>) =>
      api.patch<Homologacao>(`/homologacoes/${homologacaoId}`, campos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
      // A ficha é a "Descrição do dispositivo" do certificado
      qc.invalidateQueries({ queryKey: ['certificado'] })
    },
  })
}

/** Edita fabricante / modelo / nome comercial do dispositivo */
export function useSalvarDispositivo(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ dispositivoId, ...campos }: { dispositivoId: string } & Record<string, unknown>) =>
      api.patch<Dispositivo>(`/dispositivos/${dispositivoId}`, campos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
      qc.invalidateQueries({ queryKey: ['certificado'] })
    },
  })
}

export interface PayloadNovoModelo {
  categoriaId: string
  fabricante: string
  modelo: string
  nomeComercial: string
  bateriaId: string
  numeroSerie: string
  imei1?: string | null
  imei2?: string | null
  versaoSo: string
  gerenciamento: TipoGerenciamento
  tipoAgente: string
  versaoAgente: string
  ferramenta?: string | null
  metodoInscricao: string
  assinaturaAgente: boolean
  precisaAssinaturaDev: boolean
  dataInicio: string
}

export function useCadastrarModelo(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: PayloadNovoModelo) => api.post<Dispositivo>('/matriz/modelo', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
    },
  })
}

/** Upload da foto do dispositivo — vai para o certificado (spec §8.1) */
export function useEnviarFoto(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ dispositivoId, arquivo }: { dispositivoId: string; arquivo: File }) => {
      const dados = new FormData()
      dados.append('arquivo', arquivo)
      return api.postMultipart<Dispositivo>(`/dispositivos/${dispositivoId}/foto`, dados)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
      // O certificado embute a foto, então o preview precisa ser refeito.
      qc.invalidateQueries({ queryKey: ['certificado'] })
    },
  })
}

export function useAbrirReteste(categoriaSlug = 'pos') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: {
      dispositivoId: string
      baseHomologacaoId: string
      versaoAgente: string
      versaoSo?: string
      dataInicio: string
    }) => api.post<Homologacao>('/matriz/reteste', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chavesMatriz.matriz(categoriaSlug) })
    },
  })
}
