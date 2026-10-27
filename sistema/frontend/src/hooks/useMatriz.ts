import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { sincronizarPlanilha } from '@/lib/sincronizar'
import type {
  Dispositivo,
  Homologacao,
  Matriz,
  ResultadoMatriz,
  StatusResultado,
  TipoGerenciamento,
} from '@/lib/tipos'

export const chavesMatriz = {
  /** `empresa`: a Mobiltec abrindo a planilha de um parceiro (D510) */
  matriz: (slug: string, empresa?: string | null) =>
    ['matriz', slug, empresa?.trim().toLowerCase() || null] as const,
}

export function useMatriz(categoriaSlug = 'pos', empresa?: string | null) {
  return useQuery({
    queryKey: chavesMatriz.matriz(categoriaSlug, empresa),
    queryFn: () => api.get<Matriz>('/matriz', { categoriaSlug, empresa }),
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

    // Todas as planilhas abertas deste tipo (a da Mobiltec e a de um parceiro
    // aberta pelo painel dele): só a que tem a coluna muda de fato
    onMutate: async (p) => {
      const doTipo = ['matriz', categoriaSlug]
      await qc.cancelQueries({ queryKey: doTipo })
      const anteriores = qc.getQueriesData<Matriz>({ queryKey: doTipo })

      qc.setQueriesData<Matriz>({ queryKey: doTipo }, (velho) => {
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

      return { anteriores }
    },

    onError: (_e, _p, ctx) => {
      for (const [chave, dados] of ctx?.anteriores ?? []) qc.setQueryData(chave, dados)
    },

    // O certificado é HTML gerado no servidor a partir destes mesmos
    // resultados, e o painel e a vitrine mostram o progresso: todos recarregam.
    // Sem isso a prévia continua servindo o documento anterior — o que parece
    // que a justificativa não salvou.
    onSettled: () => sincronizarPlanilha(qc),
  })
}

/** Edita um campo da ficha (S/N, IMEI, versão do agente…) direto na matriz */
export function useSalvarFicha() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ homologacaoId, ...campos }: { homologacaoId: string } & Record<string, unknown>) =>
      api.patch<Homologacao>(`/homologacoes/${homologacaoId}`, campos),
    // A ficha é a "Descrição do dispositivo" do certificado e o resumo do card
    onSuccess: () => sincronizarPlanilha(qc),
  })
}

/** Edita fabricante / modelo / nome comercial do dispositivo */
export function useSalvarDispositivo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ dispositivoId, ...campos }: { dispositivoId: string } & Record<string, unknown>) =>
      api.patch<Dispositivo>(`/dispositivos/${dispositivoId}`, campos),
    onSuccess: () => sincronizarPlanilha(qc),
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
  /** Mobiltec cadastrando na planilha de um parceiro: o modelo nasce dele */
  empresa?: string | null
}

export function useCadastrarModelo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: PayloadNovoModelo) => api.post<Dispositivo>('/matriz/modelo', p),
    onSuccess: () => sincronizarPlanilha(qc, { estrutura: true }),
  })
}

/** Upload da foto do dispositivo — vai para o certificado (spec §8.1) */
export function useEnviarFoto() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ dispositivoId, arquivo }: { dispositivoId: string; arquivo: File }) => {
      const dados = new FormData()
      dados.append('arquivo', arquivo)
      return api.postMultipart<Dispositivo>(`/dispositivos/${dispositivoId}/foto`, dados)
    },
    // O certificado embute a foto, então o preview precisa ser refeito
    onSuccess: () => sincronizarPlanilha(qc),
  })
}

export function useAbrirReteste() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (p: {
      dispositivoId: string
      baseHomologacaoId: string
      versaoAgente: string
      versaoSo?: string
      dataInicio: string
      /** Começa com os resultados da versão anterior em vez de tudo "não testado" (D520) */
      copiarResultados?: boolean
    }) => api.post<Homologacao>('/matriz/reteste', p),
    onSuccess: () => sincronizarPlanilha(qc, { estrutura: true }),
  })
}
