/**
 * Matriz comparativa (spec §10.5) — a "planilha" web.
 *
 * GET  /matriz?categoriaSlug=pos   → linhas = itens de teste, colunas = modelos
 * POST /matriz/modelo              → cadastra modelo + abre a homologação de uma vez
 *
 * Cada coluna é um MODELO, mostrando a homologação mais recente dele. Retestes
 * antigos continuam no banco e aparecem em `homologacoesAnteriores` — a spec
 * §11.2 é clara que reteste nunca sobrescreve, o histórico por versão de agente
 * é informação de valor.
 */
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { StatusHomologacao, StatusResultado } from '@prisma/client'
import { itemAplicavel, normalizarGerenciamento } from '../lib/gerenciamento.js'
import {
  carregarUsuarioEscopo,
  ehEmpresaMobiltec,
  ehTns,
  escopoPlanilha,
  usuarioPodeOperar,
  slugsMatrizParceiro,
} from '../lib/escopo.js'
import { agruparPorDispositivo, itensPorCategoria } from '../lib/planilha.js'

const matrizRoutes: FastifyPluginAsync = async (fastify) => {

  // ============================================================
  // GET /matriz
  // ============================================================
  fastify.get('/matriz', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const { categoriaSlug = 'pos', empresa: empresaFiltro } = request.query as {
      categoriaSlug?: string
      empresa?: string
    }

    const categoria = await fastify.prisma.categoria.findUnique({
      where: { slug: categoriaSlug },
    })
    if (!categoria) return reply.status(404).send({ erro: 'Categoria não encontrada' })

    // De quem é a planilha: o parceiro vê a da própria empresa; a Mobiltec vê
    // a dela ou, com `?empresa=`, a de um parceiro (aberta pelo painel dele).
    // A regra é a mesma do painel (`escopoPlanilha`), então o que um mostra o
    // outro também mostra.
    let escopo
    if (request.user.papel === 'PARCEIRO') {
      const u = await carregarUsuarioEscopo(fastify.prisma, request.user)
      // D499: matrizes liberadas para parceiros e não ocultadas pelo ambiente da empresa
      const permitidas = await slugsMatrizParceiro(fastify.prisma, u.empresa)
      if (!u.empresa || !permitidas.includes(categoriaSlug)) {
        return reply.status(403).send({ erro: 'Acesso não permitido a esta categoria de dispositivo' })
      }
      escopo = escopoPlanilha(u.empresa, ehTns(u))
    } else {
      escopo = escopoPlanilha(empresaFiltro)
    }

    const homologacoes = await fastify.prisma.homologacao.findMany({
      where: { AND: [{ dispositivo: { categoriaId: categoria.id, ativo: true } }, escopo] },
      include: {
        dispositivo: true,
        bateria: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, nome: true } },
        resultados: {
          select: {
            id: true,
            itemId: true,
            status: true,
            observacao: true,
            justificativaId: true,
            justificativaTexto: true,
            autorEmail: true,
            atualizadoEm: true,
            justificativa: { select: { id: true, titulo: true, texto: true } },
          },
        },
        _count: { select: { certificados: true } },
        // Só o último envio para revisão, e só o que a coluna precisa: o
        // apontamento que o parceiro tem de atender (D435). `take: 1` mantém
        // a planilha leve — o histórico completo sai em GET /homologacoes/:id.
        historicoStatus: {
          where: { statusNovo: StatusHomologacao.EM_REVISAO },
          orderBy: { criadoEm: 'desc' },
          take: 1,
          select: {
            motivo: true,
            criadoEm: true,
            usuario: { select: { nome: true } },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    // Agrupa por modelo: a primeira de cada dispositivo é a mais recente
    // (findMany já veio ordenado por criadoEm desc).
    const colunas = agruparPorDispositivo(homologacoes)
      .map(([atual, ...anteriores]) => ({
        homologacao: {
          ...atual,
          // O mapa itemId → resultado economiza busca linear no front.
          resultadosPorItem: Object.fromEntries(
            atual.resultados.map(r => [r.itemId, r]),
          ),
        },
        // Fora do objeto `homologacao` de propósito: não é campo do registro,
        // é o apontamento em aberto. Só existe enquanto o status for
        // EM_REVISAO — depois que o parceiro reenvia, o aviso some da tela
        // junto com o motivo que o gerou.
        revisaoPendente:
          atual.status === StatusHomologacao.EM_REVISAO && atual.historicoStatus[0]
            ? {
                motivo: atual.historicoStatus[0].motivo,
                solicitadoEm: atual.historicoStatus[0].criadoEm,
                solicitadoPor: atual.historicoStatus[0].usuario?.nome ?? null,
              }
            : null,
        homologacoesAnteriores: anteriores.map(h => ({
          id: h.id,
          versaoAgente: h.versaoAgente,
          versaoSo: h.versaoSo,
          dataInicio: h.dataInicio,
          status: h.status,
          homologado: h.homologado,
        })),
      }))
      .sort((a, b) =>
        a.homologacao.dispositivo.nomeComercial.localeCompare(
          b.homologacao.dispositivo.nomeComercial,
          'pt-BR',
        ),
      )

    // Linhas: os itens das baterias DESTE tipo de dispositivo, e só eles.
    //
    // Antes entrava também todo item com resultado gravado, para não esconder
    // avaliação já feita. O efeito prático foi o contrário do pretendido:
    // desmarcar um item na edição do tipo não tirava a linha da planilha,
    // porque o item já tinha resultado nas colunas — e a tela ficava
    // impossível de limpar. Agora a bateria manda, e a planilha responde na
    // hora ao que foi configurado.
    //
    // Nada é apagado: os resultados continuam no banco e a linha volta
    // inteira, com o que já estava preenchido, assim que o item é remarcado.
    // Homologação já aprovada guarda o que foi atestado no certificado
    // emitido, que é arquivo e não muda.
    const naBateria = (await itensPorCategoria(fastify.prisma, [categoria.id])).get(categoria.id)!
    const itens = await fastify.prisma.itemTeste.findMany({
      where: { id: { in: [...naBateria] } },
      orderBy: [{ grupo: 'asc' }, { ordem: 'asc' }],
    })

    const gruposOrdemMap = new Map<string, number>()
    if (categoria.gruposOrdem && categoria.gruposOrdem.length > 0) {
      categoria.gruposOrdem.forEach((g, idx) => gruposOrdemMap.set(g, idx))
    } else {
      ;['TELEMETRIA', 'COLETA', 'COMANDOS', 'PERFIS'].forEach((g, idx) => gruposOrdemMap.set(g, idx))
    }

    itens.sort((a, b) => {
      const gA = gruposOrdemMap.has(a.grupo) ? gruposOrdemMap.get(a.grupo)! : 999
      const gB = gruposOrdemMap.has(b.grupo) ? gruposOrdemMap.get(b.grupo)! : 999
      if (gA !== gB) return gA - gB
      return a.ordem - b.ordem
    })

    // Os resultados acompanham as linhas: se sobrasse resultado de item fora
    // da bateria, ele contaria no medidor de divergências e no checklist de
    // finalizar sem ter linha onde ser resolvido.
    for (const c of colunas) {
      c.homologacao.resultados = c.homologacao.resultados.filter(r => naBateria.has(r.itemId))
      c.homologacao.resultadosPorItem = Object.fromEntries(
        c.homologacao.resultados.map(r => [r.itemId, r]),
      )
    }

    return { categoria, itens, colunas }
  })

  // ============================================================
  // POST /matriz/modelo — nova coluna na planilha
  // ============================================================
  fastify.post('/matriz/modelo', { onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR', 'PARCEIRO'])] }, async (request, reply) => {
    const schema = z.object({
      categoriaId: z.string(),
      // Dispositivo
      fabricante: z.string().optional().default('Fabricante').transform(s => s?.trim() || 'Fabricante'),
      modelo: z.string().optional().default('Modelo').transform(s => s?.trim() || 'Modelo'),
      nomeComercial: z.string().optional().nullable().transform(s => s?.trim() || undefined),
      linkFabricante: z.string().optional().nullable().transform(s => s?.trim() || null),
      /** Mobiltec cadastrando na planilha de um parceiro (aberta pelo painel dele) */
      empresa: z.string().optional().nullable().transform(s => s?.trim() || null),
      // Homologação inicial
      bateriaId: z.string().optional().nullable(),
      numeroSerie: z.string().optional().default('Sem informação').transform(s => s?.trim() || 'Sem informação'),
      imei1: z.string().optional().nullable().transform(s => s?.trim() || null),
      imei2: z.string().optional().nullable().transform(s => s?.trim() || null),
      versaoSo: z.string().optional().default('Android').transform(s => s?.trim() || 'Android'),
      gerenciamento: z.any().optional().transform(normalizarGerenciamento),
      tipoAgente: z.string().optional().default('Agente PoS').transform(s => s?.trim() || 'Agente PoS'),
      versaoAgente: z.string().optional().default('Não informada').transform(s => s?.trim() || 'Não informada'),
      versaoPos: z.string().optional().nullable().transform(s => s?.trim() || null),
      ferramenta: z.string().optional().nullable().transform(s => s?.trim() || null),
      metodoInscricao: z.string().optional().default('Não informado').transform(s => s?.trim() || 'Não informado'),
      assinaturaAgente: z.any().optional().transform(v => Boolean(v)),
      precisaAssinaturaDev: z.any().optional().transform(v => Boolean(v)),
      dataInicio: z.any().optional().transform(s => {
        if (!s) return new Date()
        const d = new Date(s)
        return isNaN(d.getTime()) ? new Date() : d
      }),
    })

    const body = schema.parse(request.body)
    const {
      categoriaId,
      fabricante: fabricanteRaw,
      modelo: modeloRaw,
      nomeComercial: nomeComercialRaw,
      linkFabricante,
      empresa: empresaInformada,
      bateriaId: bateriaIdRaw,
      ...restoHomologacao
    } = body

    const fabricante = fabricanteRaw || 'Fabricante'
    const modelo = modeloRaw || 'Modelo'
    const nomeComercial = nomeComercialRaw || `${fabricante} ${modelo}`.trim() || 'Dispositivo'

    // A bateria é sempre do próprio tipo: a escolhida, a ativa ou qualquer
    // uma dele. Bateria de outro tipo poria na coluna itens que a matriz deste
    // tipo não tem como linha.
    const incluirItens = { itens: { select: { itemId: true, item: { select: { somenteSupervisionado: true } } } } }
    const bateria =
      (bateriaIdRaw?.trim()
        ? await fastify.prisma.bateriaTeste.findFirst({ where: { id: bateriaIdRaw.trim(), categoriaId }, include: incluirItens })
        : null) ??
      (await fastify.prisma.bateriaTeste.findFirst({ where: { categoriaId, ativo: true }, include: incluirItens })) ??
      (await fastify.prisma.bateriaTeste.findFirst({ where: { categoriaId }, include: incluirItens }))
    if (!bateria) return reply.status(404).send({ erro: 'Este tipo de dispositivo não tem bateria de testes configurada.' })

    const dadosHomologacao = {
      ...restoHomologacao,
      bateriaId: bateria.id,
    }

    // A empresa gravada no dispositivo decide de quem é a planilha (D510).
    // Parceiro: sempre a dele. Mobiltec: a do parceiro em cuja planilha está
    // cadastrando, ou nenhuma (ambiente Mobiltec).
    let empresaDispositivo: string | null = ehEmpresaMobiltec(empresaInformada) ? null : empresaInformada
    if (request.user.papel === 'PARCEIRO') {
      const u = await carregarUsuarioEscopo(fastify.prisma, request.user)
      const cat = await fastify.prisma.categoria.findUnique({
        where: { id: categoriaId },
        select: { slug: true },
      })
      const permitidas = await slugsMatrizParceiro(fastify.prisma, u.empresa)
      if (!cat || !u.empresa || !permitidas.includes(cat.slug)) {
        return reply.status(403).send({ erro: 'Acesso não permitido a esta categoria de dispositivo' })
      }
      empresaDispositivo = u.empresa
    }

    // Dispositivo e homologação nascem juntos: uma coluna da planilha sem
    // homologação não significa nada, e um dispositivo órfão sujaria a lista.
    try {
      const dispositivo = await fastify.prisma.dispositivo.create({
        data: {
          categoriaId,
          fabricante,
          modelo,
          nomeComercial,
          linkFabricante,
          empresa: empresaDispositivo,
          homologacoes: {
            create: {
              ...dadosHomologacao,
              responsavelId: request.user.id,
              status: StatusHomologacao.RASCUNHO,
              resultados: {
                create: bateria.itens
                  .filter(bi => itemAplicavel(bi.item, restoHomologacao.gerenciamento))
                  .map(bi => ({
                    itemId: bi.itemId,
                    status: StatusResultado.NAO_TESTADO,
                  })),
              },
            },
          },
        },
        include: {
          homologacoes: {
            include: { resultados: { select: { id: true, itemId: true, status: true } } },
          },
        },
      })

      return reply.status(201).send(dispositivo)
    } catch (e: any) {
      fastify.log.error(e)
      if (e.code === 'P2002') {
        return reply.status(409).send({
          erro: `Já existe um dispositivo ${fabricante} ${modelo}. Para um novo teste do mesmo modelo, abra um reteste em vez de cadastrar de novo.`,
        })
      }
      return reply.status(400).send({
        erro: e?.message || 'Não foi possível cadastrar o modelo e abrir a homologação.',
      })
    }
  })

  // ============================================================
  // POST /matriz/reteste — nova homologação para um modelo já cadastrado
  // ============================================================
  fastify.post('/matriz/reteste', { onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR', 'PARCEIRO'])] }, async (request, reply) => {
    const schema = z.object({
      dispositivoId: z.string().uuid(),
      /** Copia a ficha da homologação anterior, mudando só o que veio no corpo */
      baseHomologacaoId: z.string().uuid(),
      versaoAgente: z.string().min(1),
      versaoSo: z.string().min(1).optional(),
      numeroSerie: z.string().min(1).optional(),
      dataInicio: z.string().transform(s => new Date(s)),
    })

    const body = schema.parse(request.body)

    const base = await fastify.prisma.homologacao.findUnique({
      where: { id: body.baseHomologacaoId },
      include: { bateria: { include: { itens: { select: { itemId: true, item: { select: { somenteSupervisionado: true } } } } } } },
    })
    if (!base) return reply.status(404).send({ erro: 'Homologação base não encontrada' })
    if (base.dispositivoId !== body.dispositivoId) {
      return reply.status(400).send({ erro: 'A homologação base não pertence a este dispositivo.' })
    }
    if (!(await usuarioPodeOperar(fastify.prisma, request.user, base.id))) {
      return reply.status(403).send({ erro: 'Você não tem acesso a este dispositivo.' })
    }

    const nova = await fastify.prisma.homologacao.create({
      data: {
        dispositivoId: body.dispositivoId,
        bateriaId: base.bateriaId,
        numeroSerie: body.numeroSerie ?? base.numeroSerie,
        imei1: base.imei1,
        imei2: base.imei2,
        versaoSo: body.versaoSo ?? base.versaoSo,
        gerenciamento: base.gerenciamento,
        tipoAgente: base.tipoAgente,
        versaoAgente: body.versaoAgente,
        versaoPos: base.versaoPos,
        ferramenta: base.ferramenta,
        metodoInscricao: base.metodoInscricao,
        assinaturaAgente: base.assinaturaAgente,
        precisaAssinaturaDev: base.precisaAssinaturaDev,
        dataInicio: body.dataInicio,
        responsavelId: request.user.id,
        localEmissao: base.localEmissao,
        status: StatusHomologacao.RASCUNHO,
        resultados: {
          create: base.bateria.itens
            .filter(bi => itemAplicavel(bi.item, base.gerenciamento))
            .map(bi => ({
              itemId: bi.itemId,
              status: StatusResultado.NAO_TESTADO,
            })),
        },
      },
    })

    return reply.status(201).send(nova)
  })
}

export default matrizRoutes
