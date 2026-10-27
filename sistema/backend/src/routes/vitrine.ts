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
import { StatusHomologacao } from '@prisma/client'
import { carregarUsuarioEscopo, escopoPlanilha, whereVeParceiro } from '../lib/escopo.js'
import {
  agruparPorDispositivo,
  ehFinalizada,
  itensPorCategoria,
  resumoDoProgresso,
  versoesDoModelo,
} from '../lib/planilha.js'

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

    // Uma linha por modelo, lida como versões (D519): o card mostra a versão
    // VIGENTE — a última aprovada —, e não a mais recente. Abrir um reteste
    // não tira o modelo do catálogo: ele segue homologado na versão anterior
    // enquanto a nova está na bancada, e o reteste vem à parte.
    const grupos = agruparPorDispositivo(homologacoes)
    // Progresso com os mesmos itens que são linha da matriz do tipo
    const itensDoTipo = await itensPorCategoria(
      fastify.prisma,
      [...new Set(grupos.map(([atual]) => atual.dispositivo.categoriaId))],
    )

    const dispositivos = grupos
      .map((grupo) => {
        const { atual, vigente } = versoesDoModelo(grupo)
        const principal = vigente ?? atual
        const naMatriz = itensDoTipo.get(atual.dispositivo.categoriaId) ?? new Set<string>()
        const reteste = vigente && atual !== vigente && !ehFinalizada(atual.status) ? atual : null

        return {
          dispositivoId: principal.dispositivoId,
          homologacaoId: principal.id,
          fabricante: principal.dispositivo.fabricante,
          modelo: principal.dispositivo.modelo,
          nomeComercial: principal.dispositivo.nomeComercial,
          fotoUrl: principal.dispositivo.fotoUrl,
          linkFabricante: principal.dispositivo.linkFabricante,
          categoriaNome: principal.dispositivo.categoria.nome,
          categoriaSlug: principal.dispositivo.categoria.slug,
          versaoSo: principal.versaoSo,
          versaoAgente: principal.versaoAgente,
          versaoPos: principal.versaoPos,
          gerenciamento: principal.gerenciamento,
          tipoAgente: principal.tipoAgente,
          status: principal.status,
          homologado: principal.homologado,
          dataInicio: principal.dataInicio,
          dataFim: principal.dataFim,
          responsavel: principal.responsavel.nome,
          numeroHomologacao: grupo.length,
          // As outras versões já fechadas (o reteste em andamento vem à parte)
          versoesAnteriores: grupo
            .filter((h) => h !== principal && h !== reteste)
            .map((h) => h.versaoAgente),
          resumo: resumoDoProgresso(principal.resultados, naMatriz),
          reteste: reteste && {
            homologacaoId: reteste.id,
            versaoAgente: reteste.versaoAgente,
            versaoSo: reteste.versaoSo,
            gerenciamento: reteste.gerenciamento,
            status: reteste.status,
            dataInicio: reteste.dataInicio,
            responsavel: reteste.responsavel.nome,
            resumo: resumoDoProgresso(reteste.resultados, naMatriz),
          },
        }
      })
      .sort((a, b) => a.nomeComercial.localeCompare(b.nomeComercial, 'pt-BR'))

    return { categorias, dispositivos }
  })
}

export default vitrineRoutes
