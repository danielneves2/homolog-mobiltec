/**
 * Montagem comum às telas que leem a planilha (D510): matriz, painel do
 * parceiro e vitrine. As três contam a mesma história — mesmo modelo, mesma
 * homologação "atual", mesmo progresso — porque saem destas duas funções.
 */
import type { PrismaClient } from '@prisma/client'

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
