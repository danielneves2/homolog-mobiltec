/**
 * Montagem comum às telas que leem a planilha (D510): matriz, painel do
 * parceiro e vitrine. As três contam a mesma história — mesmo modelo, mesma
 * homologação "atual", mesmo progresso — porque saem destas duas funções.
 */
import type { Prisma, PrismaClient, StatusHomologacao, StatusResultado, TipoGerenciamento } from '@prisma/client'
import { itemAplicavel } from './gerenciamento.js'

/** Homologação que atesta o modelo: aprovada ou publicada */
export const ehHomologada = (s: StatusHomologacao) => s === 'APROVADO' || s === 'PUBLICADO'

/** Homologação encerrada — aprovada, publicada ou reprovada. Só daqui sai reteste (D520) */
export const ehFinalizada = (s: StatusHomologacao) => ehHomologada(s) || s === 'REPROVADO'

/**
 * As homologações de um modelo lidas como versões (D519). Recebe o grupo de
 * `agruparPorDispositivo` (mais recente primeiro).
 *
 *  - `atual`: a mais recente — é nela que a matriz trabalha.
 *  - `vigente`: a última aprovada — é ela que diz "homologado" no catálogo.
 *    Reteste em andamento ou reprovado não tira o selo da versão anterior:
 *    a reprovação vale para a versão nova, não para a que já foi atestada.
 *  - `anterior`: a base de comparação da atual — a última finalizada antes
 *    dela (ou a anterior, em dado legado sem nenhuma finalizada).
 *  - `emReteste`: o modelo voltou para a bancada e ainda não fechou.
 */
export function versoesDoModelo<T extends { status: StatusHomologacao }>(grupo: T[]) {
  const [atual, ...anteriores] = grupo
  return {
    atual,
    anteriores,
    vigente: grupo.find((h) => ehHomologada(h.status)) ?? null,
    anterior: anteriores.find((h) => ehFinalizada(h.status)) ?? anteriores[0] ?? null,
    emReteste: anteriores.length > 0 && !ehFinalizada(atual.status),
  }
}

/**
 * Versões do modelo e o que mudou da anterior para esta (D522), para a ficha
 * e a validação. `visivel` recorta as versões que quem pergunta pode ver.
 *
 * `mudancas` são os itens da matriz atual cujo resultado difere do da versão
 * anterior; `antes: null` é item que não existia naquela versão.
 */
export async function historicoDoModelo(
  prisma: PrismaClient,
  h: {
    id: string
    dispositivoId: string
    criadoEm: Date
    resultados: { itemId: string; status: StatusResultado; item: { nome: string; grupo: string } }[]
  },
  visivel: Prisma.HomologacaoWhereInput = {},
) {
  const versoes = await prisma.homologacao.findMany({
    where: { AND: [{ dispositivoId: h.dispositivoId }, visivel] },
    select: { id: true, versaoAgente: true, versaoSo: true, gerenciamento: true, status: true, dataInicio: true, dataFim: true, criadoEm: true },
    orderBy: { criadoEm: 'desc' },
  })
  const maisAntigas = versoes.filter((v) => v.criadoEm < h.criadoEm)
  const anterior = maisAntigas.find((v) => ehFinalizada(v.status)) ?? maisAntigas[0] ?? null
  if (!anterior) return { versoes, comparacao: null }

  const antes = new Map(
    (await prisma.resultado.findMany({ where: { homologacaoId: anterior.id }, select: { itemId: true, status: true } }))
      .map((r) => [r.itemId, r.status]),
  )
  const mudancas = h.resultados.flatMap((r) => {
    const a = antes.get(r.itemId) ?? null
    return a === r.status ? [] : [{ itemId: r.itemId, nome: r.item.nome, grupo: r.item.grupo, antes: a, agora: r.status }]
  })
  return {
    versoes,
    comparacao: {
      homologacaoId: anterior.id,
      versaoAgente: anterior.versaoAgente,
      versaoSo: anterior.versaoSo,
      status: anterior.status,
      mudancas,
    },
  }
}

/** Divergência é o que a spec §5 define — NAO_APLICAVEL não entra */
const EXIGE_JUSTIFICATIVA: StatusResultado[] = ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA']

/**
 * Progresso de uma homologação contado só com as linhas da matriz do tipo.
 * Avaliado = tudo que saiu de NAO_TESTADO. Painel e vitrine usam a mesma conta.
 */
export function resumoDoProgresso(
  resultados: { itemId: string; status: StatusResultado; justificativaId: string | null; justificativaTexto: string | null }[],
  naMatriz: Set<string>,
) {
  const resumo = { total: 0, ok: 0, divergencias: 0, semJustificativa: 0, naoAplicavel: 0, naoTestado: 0, avaliados: 0 }
  for (const r of resultados) {
    if (!naMatriz.has(r.itemId)) continue
    resumo.total++
    if (r.status === 'OK') resumo.ok++
    else if (r.status === 'NAO_APLICAVEL') resumo.naoAplicavel++
    else if (r.status === 'NAO_TESTADO') resumo.naoTestado++
    if (EXIGE_JUSTIFICATIVA.includes(r.status)) {
      resumo.divergencias++
      if (!r.justificativaId && !r.justificativaTexto) resumo.semJustificativa++
    }
  }
  resumo.avaliados = resumo.total - resumo.naoTestado
  return resumo
}

/**
 * Agrupa por modelo. Com a lista em `criadoEm desc`, o primeiro de cada grupo
 * é a homologação mais recente — a que vale para a coluna/card; as demais são
 * os retestes anteriores (spec §11.2: reteste nunca sobrescreve).
 */
export function agruparPorDispositivo<T extends { dispositivoId: string }>(homologacoes: T[]): T[][] {
  const porDispositivo = new Map<string, T[]>()
  for (const h of homologacoes) {
    const lista = porDispositivo.get(h.dispositivoId) ?? []
    lista.push(h)
    porDispositivo.set(h.dispositivoId, lista)
  }
  return [...porDispositivo.values()]
}

/**
 * Itens de teste de cada tipo de dispositivo: os das baterias do tipo, e só
 * eles. É o que define as linhas da matriz — e, por isso, o que entra na conta
 * de progresso em qualquer tela. Resultado de item tirado da bateria continua
 * no banco, mas não conta (ver GET /matriz).
 */
export async function itensPorCategoria(
  prisma: PrismaClient,
  categoriaIds: string[],
): Promise<Map<string, Set<string>>> {
  const mapa = new Map<string, Set<string>>(categoriaIds.map((id) => [id, new Set<string>()]))
  if (categoriaIds.length === 0) return mapa
  const vinculos = await prisma.bateriaItem.findMany({
    where: { bateria: { categoriaId: { in: categoriaIds } } },
    select: { itemId: true, bateria: { select: { categoriaId: true } } },
  })
  for (const v of vinculos) mapa.get(v.bateria.categoriaId)?.add(v.itemId)
  return mapa
}

/**
 * Resultados de uma homologação do jeito que a matriz do tipo os mostra hoje
 * (D517) — vale para homologação aberta ou aprovada, na ficha web, no
 * certificado web e no PDF:
 *  - item que saiu da matriz sai daqui também (o resultado continua no banco
 *    e volta se o item for remarcado);
 *  - item que entrou depois aparece como "não testado" (linha em branco no
 *    certificado), salvo item só de supervisionado numa homologação BYOD.
 *
 * `removidos` são os nomes que saíram — servem para limpar a análise de
 * divergências escrita à mão, que cita os itens pelo nome.
 */
export async function resultadosDaMatriz<R extends { itemId: string; item: { nome: string } }>(
  prisma: PrismaClient,
  h: { id: string; gerenciamento: TipoGerenciamento; dispositivo: { categoriaId: string }; resultados: R[] },
): Promise<{ resultados: R[]; removidos: string[] }> {
  const naMatriz = (await itensPorCategoria(prisma, [h.dispositivo.categoriaId])).get(h.dispositivo.categoriaId)!
  const ficam = h.resultados.filter((r) => naMatriz.has(r.itemId))
  const removidos = h.resultados.filter((r) => !naMatriz.has(r.itemId)).map((r) => r.item.nome)

  const presentes = new Set(ficam.map((r) => r.itemId))
  const faltando = [...naMatriz].filter((id) => !presentes.has(id))
  if (faltando.length) {
    const itens = await prisma.itemTeste.findMany({ where: { id: { in: faltando } } })
    for (const item of itens) {
      if (!itemAplicavel(item, h.gerenciamento)) continue
      // Linha sem registro no banco: só para exibir, nunca gravada daqui
      ficam.push({
        id: `pendente-${item.id}`,
        homologacaoId: h.id,
        itemId: item.id,
        status: 'NAO_TESTADO',
        observacao: null,
        justificativaId: null,
        justificativaTexto: null,
        autorEmail: null,
        atualizadoEm: null,
        item,
        justificativa: null,
      } as unknown as R)
    }
  }
  // Na ordem da matriz dentro de cada grupo (quem exibe agrupa por grupo)
  ficam.sort((a, b) => ((a.item as { ordem?: number }).ordem ?? 0) - ((b.item as { ordem?: number }).ordem ?? 0))
  return { resultados: ficam, removidos }
}
