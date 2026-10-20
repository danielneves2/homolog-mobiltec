/**
 * Escopo de visibilidade e operação por empresa — FONTE ÚNICA (D483, D510).
 *
 * Dono de uma homologação é a EMPRESA DO DISPOSITIVO, gravada quando o modelo
 * entra na planilha (`dispositivo.empresa`; vazio = Mobiltec). Não é a pessoa
 * que cadastrou: o colega da mesma empresa vê e opera o mesmo que ela, e quem
 * muda de empresa não leva os dados da anterior.
 *
 * Regras de hierarquia:
 *  - ADMIN/HOMOLOGADOR (Mobiltec) enxergam e operam tudo.
 *  - Cada parceiro tem a própria planilha/painel: só vê e opera o que é da sua
 *    empresa.
 *  - Exceção TNS: na categoria PoS a TNS divide a planilha com a Mobiltec —
 *    vê e opera as homologações PoS da Mobiltec e vice-versa.
 *  - Homologações APROVADAS/PUBLICADAS e o andamento interno da Mobiltec são
 *    vitrine: qualquer parceiro pode consultar (nunca editar), nos tipos
 *    liberados para parceiros (D498).
 *
 * Matriz e painel saem da mesma regra (`escopoPlanilha`): o painel mostra um
 * card para cada coluna que a matriz mostraria, e nada além disso.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { STATUS_EDITAVEIS_PARCEIRO } from './transicoes.js'

export const SLUG_POS = 'pos'

const STATUS_FINAIS = ['APROVADO', 'PUBLICADO'] as const

/** Casa com nada — parceiro sem empresa não tem planilha */
const NENHUMA: Prisma.HomologacaoWhereInput = { OR: [] }

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

/** Empresa vazia ou "Mobiltec" = ambiente da própria Mobiltec */
export function ehEmpresaMobiltec(empresa: string | null | undefined): boolean {
  const e = empresa?.trim().toLowerCase()
  return !e || e === 'mobiltec'
}

/**
 * Empresa parceira a quem a homologação responde — destino das notificações
 * e de quem recebe a devolução. É a dona do dispositivo; num modelo da
 * Mobiltec (a planilha PoS compartilhada), a do parceiro que executou o teste.
 * `null` = assunto interno da Mobiltec.
 */
export function empresaParceiraDa(h: {
  dispositivo?: { empresa: string | null } | null
  responsavel?: { empresa: string | null } | null
}): string | null {
  const dona = h.dispositivo?.empresa?.trim()
  if (!ehEmpresaMobiltec(dona)) return dona!
  const executou = h.responsavel?.empresa?.trim()
  return ehEmpresaMobiltec(executou) ? null : executou!
}

const igual = (empresa: string) => ({ equals: empresa, mode: 'insensitive' as const })

/** Homologação do ambiente Mobiltec: dispositivo sem empresa externa */
export const ESCOPO_MOBILTEC: Prisma.HomologacaoWhereInput = {
  dispositivo: { OR: [{ empresa: null }, { empresa: igual('Mobiltec') }] },
}

/** Homologações PoS que pertencem à TNS (a planilha compartilhada com a Mobiltec) */
export const ESCOPO_TNS_POS: Prisma.HomologacaoWhereInput = {
  dispositivo: {
    categoria: { slug: SLUG_POS },
    OR: [{ empresa: igual('TNS') }, { empresa: igual('TNSI') }],
  },
}

/**
 * A planilha de uma empresa, em todos os tipos de dispositivo.
 *
 *  - Mobiltec (ou sem empresa): o ambiente Mobiltec + a TNS em PoS.
 *  - Parceiro: os dispositivos da empresa; a TNS soma o PoS da Mobiltec.
 *
 * É o que a matriz mostra (filtrando o tipo) e o que o painel lista.
 */
export function escopoPlanilha(
  empresa: string | null | undefined,
  tns = ehTns({ empresa }),
): Prisma.HomologacaoWhereInput {
  if (ehEmpresaMobiltec(empresa)) return { OR: [ESCOPO_MOBILTEC, ESCOPO_TNS_POS] }
  const ou: Prisma.HomologacaoWhereInput[] = [{ dispositivo: { empresa: igual(empresa!.trim()) } }]
  if (tns) ou.push({ AND: [{ dispositivo: { categoria: { slug: SLUG_POS } } }, ESCOPO_MOBILTEC] })
  return { OR: ou }
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

/** O que o parceiro pode OPERAR (editar resultados, ficha, submeter): a planilha da empresa */
export function whereOperaParceiro(u: UsuarioEscopo): Prisma.HomologacaoWhereInput {
  if (!u.empresa) return NENHUMA
  return escopoPlanilha(u.empresa, ehTns(u))
}

/** O que o parceiro pode CONSULTAR: o que opera + vitrine (finalizadas e andamento Mobiltec) */
export function whereVeParceiro(u: UsuarioEscopo): Prisma.HomologacaoWhereInput {
  return {
    OR: [
      {
        AND: [
          { OR: [{ status: { in: [...STATUS_FINAIS] } }, ESCOPO_MOBILTEC] },
          { dispositivo: { categoria: { ativo: true, liberadaParceiros: true } } },
        ],
      },
      whereOperaParceiro(u),
    ],
  }
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

/**
 * Parceiro pode editar o cadastro do dispositivo (nome, foto…)? Só com uma
 * homologação dele da empresa ainda na bancada (rascunho ou revisão) — a
 * mesma janela em que ele edita a ficha e os resultados.
 */
export async function usuarioPodeEditarDispositivo(
  prisma: PrismaClient,
  user: { id: string; email: string; papel: string },
  dispositivoId: string,
): Promise<boolean> {
  if (user.papel !== 'PARCEIRO') return true
  const u = await carregarUsuarioEscopo(prisma, user)
  const n = await prisma.homologacao.count({
    where: { dispositivoId, status: { in: STATUS_EDITAVEIS_PARCEIRO }, ...whereOperaParceiro(u) },
  })
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
