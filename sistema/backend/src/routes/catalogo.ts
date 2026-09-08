/**
 * Rotas de categorias, itens de teste, baterias e justificativas
 */
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const catalogoRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================
  // CATEGORIAS
  // ============================================================
  fastify.get('/categorias', { onRequest: [fastify.autenticar] }, async (request) => {
    // Por padrão só as que estão em operação — é o que monta o menu.
    const { todas } = request.query as { todas?: string }
    return fastify.prisma.categoria.findMany({
      where: todas === 'true' ? {} : { ativo: true },
      orderBy: { ordem: 'asc' },
      include: {
        _count: { select: { dispositivos: { where: { ativo: true } } } },
      },
    })
  })

  // ============================================================
  // ITENS DE TESTE
  // ============================================================
  fastify.get('/itens-teste', { onRequest: [fastify.autenticar] }, async (request) => {
    const { grupo, ativo } = request.query as { grupo?: string; ativo?: string }
    return fastify.prisma.itemTeste.findMany({
      where: {
        ativo: ativo === 'false' ? false : true,
        ...(grupo ? { grupo: grupo as any } : {}),
      },
      orderBy: [{ grupo: 'asc' }, { ordem: 'asc' }],
    })
  })

  fastify.post('/itens-teste', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const schema = z.object({
      grupo: z.enum(['TELEMETRIA', 'COLETA', 'COMANDOS', 'PERFIS']),
      nome: z.string().min(1).max(200),
      descricaoAcao: z.string().min(1).max(500),
      ordem: z.number().int().default(0),
    })
    const body = schema.parse(request.body)
    const item = await fastify.prisma.itemTeste.create({ data: body })
    return reply.status(201).send(item)
  })

  fastify.patch('/itens-teste/:id', { onRequest: [fastify.autenticar] }, async (request) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      nome: z.string().min(1).max(200).optional(),
      descricaoAcao: z.string().min(1).max(500).optional(),
      ordem: z.number().int().optional(),
      ativo: z.boolean().optional(),
    })
    const body = schema.parse(request.body)
    // REGRA: nunca deletar item; só desativar via ativo=false
    return fastify.prisma.itemTeste.update({ where: { id }, data: body })
  })

  // ============================================================
  // BATERIAS DE TESTE
  // ============================================================
  fastify.get('/baterias', { onRequest: [fastify.autenticar] }, async (request) => {
    const { categoriaId } = request.query as { categoriaId?: string }
    return fastify.prisma.bateriaTeste.findMany({
      where: {
        ativo: true,
        ...(categoriaId ? { categoriaId } : {}),
      },
      include: {
        categoria: { select: { nome: true, slug: true } },
        itens: {
          include: { item: true },
          orderBy: { ordem: 'asc' },
        },
        _count: { select: { itens: true } },
      },
    })
  })

  fastify.get('/baterias/:id', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const bateria = await fastify.prisma.bateriaTeste.findUnique({
      where: { id },
      include: {
        categoria: true,
        itens: {
          include: { item: true },
          orderBy: [{ item: { grupo: 'asc' } }, { ordem: 'asc' }],
        },
      },
    })
    if (!bateria) return reply.status(404).send({ erro: 'Bateria não encontrada' })
    return bateria
  })

  fastify.post('/baterias', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const schema = z.object({
      categoriaId: z.string().uuid(),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      itens: z.array(z.object({
        itemId: z.string().uuid(),
        ordem: z.number().int().default(0),
        obrigatorio: z.boolean().default(true),
      })),
    })
    const body = schema.parse(request.body)
    const { itens, ...dadosBateria } = body
    const bateria = await fastify.prisma.bateriaTeste.create({
      data: {
        ...dadosBateria,
        itens: {
          create: itens.map(i => ({
            itemId: i.itemId,
            ordem: i.ordem,
            obrigatorio: i.obrigatorio,
          })),
        },
      },
      include: { itens: { include: { item: true } } },
    })
    return reply.status(201).send(bateria)
  })

  // ============================================================
  // JUSTIFICATIVAS
  // ============================================================
  fastify.get('/justificativas', { onRequest: [fastify.autenticar] }, async (request) => {
    const { itemId, gerenciamento, androidMin } = request.query as {
      itemId?: string
      gerenciamento?: string
      androidMin?: string
    }

    const justificativas = await fastify.prisma.justificativa.findMany({
      where: { ativo: true },
      orderBy: [{ usoCount: 'desc' }, { titulo: 'asc' }],
    })

    // Filtragem por sugestão (feita em memória pois itensSugeridos é array)
    if (itemId || gerenciamento || androidMin) {
      const androidMinNum = androidMin ? parseInt(androidMin) : null
      return justificativas.filter(j => {
        const matchItem = !itemId || j.itensSugeridos.includes(itemId)
        const matchGerenciamento = !gerenciamento || !j.gerenciamento || j.gerenciamento === gerenciamento
        const matchAndroid = !androidMinNum || !j.androidMin || j.androidMin <= androidMinNum
        return matchItem && matchGerenciamento && matchAndroid
      })
    }

    return justificativas
  })

  fastify.post('/justificativas', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const schema = z.object({
      titulo: z.string().min(1),
      texto: z.string().min(1),
      fontes: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
      itensSugeridos: z.array(z.string().uuid()).default([]),
      androidMin: z.number().int().optional().nullable(),
      gerenciamento: z.enum(['ANDROID_LEGADO', 'ANDROID_ENTERPRISE']).optional().nullable(),
    })
    const body = schema.parse(request.body)
    const j = await fastify.prisma.justificativa.create({ data: body as any })
    return reply.status(201).send(j)
  })

  fastify.patch('/justificativas/:id', { onRequest: [fastify.autenticar] }, async (request) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      titulo: z.string().optional(),
      texto: z.string().optional(),
      fontes: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
      itensSugeridos: z.array(z.string().uuid()).optional(),
      androidMin: z.number().int().optional().nullable(),
      gerenciamento: z.enum(['ANDROID_LEGADO', 'ANDROID_ENTERPRISE']).optional().nullable(),
      ativo: z.boolean().optional(),
    })
    const body = schema.parse(request.body)
    return fastify.prisma.justificativa.update({ where: { id }, data: body as any })
  })

  // ============================================================
  // USUÁRIOS (admin only)
  // ============================================================
  fastify.get('/usuarios', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    if (request.user.papel !== 'ADMIN') {
      return reply.status(403).send({ erro: 'Acesso restrito a administradores' })
    }
    return fastify.prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, cargo: true, papel: true, ativo: true, criadoEm: true },
      orderBy: { nome: 'asc' },
    })
  })
}

export default catalogoRoutes
