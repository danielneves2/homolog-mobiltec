/**
 * Escopo de visibilidade e operação por empresa — FONTE ÚNICA.
 *
 * Regras de hierarquia:
 *  - ADMIN/HOMOLOGADOR (Mobiltec) enxergam e operam tudo.
 *  - Cada parceiro tem a própria planilha/painel: só vê e opera o que é da sua
 *    empresa (dispositivo cadastrado por ela ou homologação de alguém dela).
 *  - Exceção TNS: na categoria PoS a TNS divide a planilha com a Mobiltec —
 *    vê e opera as homologações PoS da Mobiltec e vice-versa.
 *  - Homologações APROVADAS/PUBLICADAS e o andamento interno da Mobiltec são
 *    vitrine: qualquer parceiro pode consultar (nunca editar).
 */
import type { Prisma, PrismaClient } from '@prisma/client'

export const SLUG_POS = 'pos'

const STATUS_FINAIS = ['APROVADO', 'PUBLICADO'] as const

export interface UsuarioEscopo {
  id: string
  email: string
  empresa: string | null
}

/** TNS = empresa "TNS"/"TNSI" ou e-mail do domínio tnsi.com */
export function ehTns(u: { empresa?: string | null; email?: string | null }): boolean {
  const empresa = u.empresa?.trim().toLowerCase()
  if (empresa === 'tns' || empresa === 'tnsi') return true
  return Boolean(u.email?.toLowerCase().endsWith('@tnsi.com'))
}

const igual = (empresa: string) => ({ equals: empresa, mode: 'insensitive' as const })

/** Homologação do ambiente Mobiltec: dispositivo e responsável sem empresa externa */
export const ESCOPO_MOBILTEC: Prisma.HomologacaoWhereInput = {
  AND: [
    { OR: [{ dispositivo: { empresa: null } }, { dispositivo: { empresa: igual('Mobiltec') } }] },
    { OR: [{ responsavel: { empresa: null } }, { responsavel: { empresa: igual('Mobiltec') } }] },
  ],
}

/** Homologações PoS que pertencem à TNS (a planilha compartilhada com a Mobiltec) */
export const ESCOPO_TNS_POS: Prisma.HomologacaoWhereInput = {
  dispositivo: { categoria: { slug: SLUG_POS } },
  OR: [
    { dispositivo: { empresa: igual('TNS') } },
    { dispositivo: { empresa: igual('TNSI') } },
    { responsavel: { empresa: igual('TNS') } },
    { responsavel: { empresa: igual('TNSI') } },
  ],
}

export async function carregarUsuarioEscopo(
  prisma: PrismaClient,
  user: { id: string; email: string },
): Promise<UsuarioEscopo> {
  const u = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresa: true },
  })
  return { id: user.id, email: user.email, empresa: u?.empresa?.trim() || null }
}

/** O que o parceiro pode OPERAR (editar resultados, ficha, submeter) */
export function whereOperaParceiro(u: UsuarioEscopo): Prisma.HomologacaoWhereInput {
  const ou: Prisma.HomologacaoWhereInput[] = [{ responsavelId: u.id }, { apoioId: u.id }]
  if (u.empresa) {
    ou.push({ dispositivo: { empresa: igual(u.empresa) } }, { responsavel: { empresa: igual(u.empresa) } })
  }
  if (ehTns(u)) {
    // Planilha PoS compartilhada com a Mobiltec
    ou.push({ AND: [{ dispositivo: { categoria: { slug: SLUG_POS } } }, ESCOPO_MOBILTEC] })
  }
  return { OR: ou }
}

/** O que o parceiro pode CONSULTAR: o que opera + vitrine (finalizadas e andamento Mobiltec) */
export function whereVeParceiro(u: UsuarioEscopo): Prisma.HomologacaoWhereInput {
  return {
    OR: [
      { status: { in: [...STATUS_FINAIS] } },
      ESCOPO_MOBILTEC,
      whereOperaParceiro(u),
    ],
  }
}

/** Planilha (matriz) de uma categoria vista por um parceiro */
export function whereMatrizParceiro(u: UsuarioEscopo, categoriaSlug: string): Prisma.HomologacaoWhereInput {
  const ou: Prisma.HomologacaoWhereInput[] = [{ responsavelId: u.id }]
  if (u.empresa) {
    ou.push({ dispositivo: { empresa: igual(u.empresa) } }, { responsavel: { empresa: igual(u.empresa) } })
  }
  if (ehTns(u) && categoriaSlug === SLUG_POS) ou.push(ESCOPO_MOBILTEC)
  return { OR: ou }
}

/** Planilha Mobiltec de uma categoria vista pelo admin (inclui a TNS em PoS) */
export function whereMatrizMobiltec(categoriaSlug: string): Prisma.HomologacaoWhereInput {
  if (categoriaSlug === SLUG_POS) return { OR: [ESCOPO_MOBILTEC, ESCOPO_TNS_POS] }
  return ESCOPO_MOBILTEC
}

/** Parceiro pode consultar esta homologação? (ADMIN/HOMOLOGADOR sempre podem) */
export async function usuarioPodeVer(
  prisma: PrismaClient,
  user: { id: string; email: string; papel: string },
  homologacaoId: string,
): Promise<boolean> {
  if (user.papel !== 'PARCEIRO') return true
  const u = await carregarUsuarioEscopo(prisma, user)
  const n = await prisma.homologacao.count({ where: { id: homologacaoId, ...whereVeParceiro(u) } })
  return n > 0
}

/** Parceiro pode operar nesta homologação? (ADMIN/HOMOLOGADOR sempre podem) */
export async function usuarioPodeOperar(
  prisma: PrismaClient,
  user: { id: string; email: string; papel: string },
  homologacaoId: string,
): Promise<boolean> {
  if (user.papel !== 'PARCEIRO') return true
  const u = await carregarUsuarioEscopo(prisma, user)
  const n = await prisma.homologacao.count({ where: { id: homologacaoId, ...whereOperaParceiro(u) } })
  return n > 0
}

// ============================================================
// D498–D500: tipos de dispositivo visíveis para o parceiro
// ============================================================

/** Chave do ambiente de uma empresa (a empresa é texto livre no usuário) */
export function chaveAmbiente(empresa: string | null | undefined): string | null {
  const k = empresa?.trim().toLowerCase()
  return k ? k : null
}

/** Tipos ativos liberados para parceiros (D498) — o que o Painel Mobiltec mostra a eles */
export async function slugsLiberadosParceiros(prisma: PrismaClient): Promise<string[]> {
  const cats = await prisma.categoria.findMany({
    where: { ativo: true, liberadaParceiros: true },
    select: { slug: true },
  })
  return cats.map((c) => c.slug)
}

/** Tipos que o ambiente da empresa ocultou do menu e da matriz (D500) */
export async function slugsOcultosAmbiente(prisma: PrismaClient, empresa: string | null | undefined): Promise<string[]> {
  const chave = chaveAmbiente(empresa)
  if (!chave) return []
  const amb = await prisma.ambienteParceiro.findUnique({ where: { empresa: chave }, select: { categoriasOcultas: true } })
  return amb?.categoriasOcultas ?? []
}

/**
 * Matrizes que um usuário parceiro enxerga no menu e pode operar (D499):
 * tipos ativos, liberados para parceiros e não ocultados pelo ambiente da empresa.
 * Substitui a lista gravada por usuário (`categoriasPermitidas`).
 */
export async function slugsMatrizParceiro(prisma: PrismaClient, empresa: string | null | undefined): Promise<string[]> {
  const [liberados, ocultos] = await Promise.all([slugsLiberadosParceiros(prisma), slugsOcultosAmbiente(prisma, empresa)])
  const oc = new Set(ocultos)
  return liberados.filter((s) => !oc.has(s))
}
