/**
 * Vitrine — a visão que o parceiro/cliente vê dos dispositivos homologados.
 *
 * GET /vitrine   → catálogo de modelos, um card por dispositivo
 *
 * Hoje a tela mora dentro do sistema (atrás do login), mas o formato já é o
 * do portal externo: nada de rascunho de teste, só o que dá para publicar —
 * modelo, versão do agente, Android e o veredito. O andamento de quem ainda
 * está em homologação vai num bloco separado, sem expor resultado item a item.
 */
import { FastifyPluginAsync } from 'fastify'
import { StatusHomologacao, StatusResultado } from '@prisma/client'
import { carregarUsuarioEscopo, escopoPlanilha, whereVeParceiro } from '../lib/escopo.js'
import { agruparPorDispositivo, itensPorCategoria } from '../lib/planilha.js'

/** Divergência é o que a spec §5 define — NAO_APLICAVEL não entra */
const EXIGE_JUSTIFICATIVA: StatusResultado[] = [
  StatusResultado.FALHA,
  StatusResultado.NAO_SUPORTADO,
  StatusResultado.COM_RESSALVA,
]

const vitrineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/vitrine', { onRequest: [fastify.autenticar] }, async (request) => {
    const ehParceiro = request.user.papel === 'PARCEIRO'
    // D498: tipo de "homologação interna" não aparece para parceiros, nem na vitrine.
    // O que o ambiente da empresa ocultou (D500) continua aqui: o Painel Mobiltec mostra todos os aprovados.
    const whereCategoria = ehParceiro ? { ativo: true, liberadaParceiros: true } : { ativo: true }
    const categorias = await fastify.prisma.categoria.findMany({
      where: whereCategoria,
      orderBy: { ordem: 'asc' },
      select: { id: true, nome: true, slug: true, icone: true },
    })

    // O que entra (D510, mesma regra de escopo da matriz e do painel):
    //  1. Aprovados/publicados de qualquer empresa — é a vitrine.
    //  2. O andamento da planilha Mobiltec (com a TNS em PoS, que divide a
    //     planilha) — a Mobiltec vê tudo; o parceiro vê o andamento interno.
    //  3. Para o parceiro, o andamento da própria planilha.
    const escopo = ehParceiro
      ? whereVeParceiro(await carregarUsuarioEscopo(fastify.prisma, request.user))
      : { OR: [{ status: { in: [StatusHomologacao.APROVADO, StatusHomologacao.PUBLICADO] } }, escopoPlanilha(null)] }

    const whereHomologacao = {
      AND: [{ dispositivo: { ativo: true, categoria: whereCategoria } }, escopo],
    }

    const homologacoes = await fastify.prisma.homologacao.findMany({
      where: whereHomologacao,
      include: {
        dispositivo: { include: { categoria: { select: { nome: true, slug: true } } } },
        responsavel: { select: { nome: true } },
        resultados: { select: { itemId: true, status: true, justificativaId: true, justificativaTexto: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })

    // Uma linha por modelo: a homologação mais recente é a que vale.
    // As anteriores viram só a contagem de retestes.
    const grupos = agruparPorDispositivo(homologacoes)
    // Progresso com os mesmos itens que são linha da matriz do tipo
    const itensDoTipo = await itensPorCategoria(
      fastify.prisma,
      [...new Set(grupos.map(([atual]) => atual.dispositivo.categoriaId))],
    )

    const dispositivos = grupos
      .map(([atual, ...anteriores]) => {
        const naBateria = itensDoTipo.get(atual.dispositivo.categoriaId) ?? new Set<string>()
        const resultados = atual.resultados.filter(r => naBateria.has(r.itemId))
        const resumo = {
          total: resultados.length,
          ok: 0,
          divergencias: 0,
          semJustificativa: 0,
          naoAplicavel: 0,
          naoTestado: 0,
        }
        for (const r of resultados) {
          if (r.status === StatusResultado.OK) resumo.ok++
          else if (r.status === StatusResultado.NAO_APLICAVEL) resumo.naoAplicavel++
          else if (r.status === StatusResultado.NAO_TESTADO) resumo.naoTestado++
          if (EXIGE_JUSTIFICATIVA.includes(r.status)) {
            resumo.divergencias++
            if (!r.justificativaId && !r.justificativaTexto) resumo.semJustificativa++
          }
        }

        return {
          dispositivoId: atual.dispositivoId,
          homologacaoId: atual.id,
          fabricante: atual.dispositivo.fabricante,
          modelo: atual.dispositivo.modelo,
          nomeComercial: atual.dispositivo.nomeComercial,
          fotoUrl: atual.dispositivo.fotoUrl,
          linkFabricante: atual.dispositivo.linkFabricante,
          categoriaNome: atual.dispositivo.categoria.nome,
          categoriaSlug: atual.dispositivo.categoria.slug,
          versaoSo: atual.versaoSo,
          versaoAgente: atual.versaoAgente,
          versaoPos: atual.versaoPos,
          gerenciamento: atual.gerenciamento,
          tipoAgente: atual.tipoAgente,
          status: atual.status,
          homologado: atual.homologado,
          dataInicio: atual.dataInicio,
          dataFim: atual.dataFim,
          responsavel: atual.responsavel.nome,
          numeroHomologacao: anteriores.length + 1,
          versoesAnteriores: anteriores.map(h => h.versaoAgente),
          resumo: {
            ...resumo,
            // Avaliado = tudo que saiu de NAO_TESTADO. É o progresso que a
            // vitrine mostra para quem ainda está em homologação.
            avaliados: resumo.total - resumo.naoTestado,
          },
        }
      })
      .sort((a, b) => a.nomeComercial.localeCompare(b.nomeComercial, 'pt-BR'))

    return { categorias, dispositivos }
  })
}

export default vitrineRoutes
