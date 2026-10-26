/**
 * Montagem comum às telas que leem a planilha (D510): matriz, painel do
 * parceiro e vitrine. As três contam a mesma história — mesmo modelo, mesma
 * homologação "atual", mesmo progresso — porque saem destas duas funções.
 */
import type { PrismaClient, TipoGerenciamento } from '@prisma/client'
import { itemAplicavel } from './gerenciamento.js'

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
