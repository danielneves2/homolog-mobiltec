/**
 * CRUD de dispositivos
 * GET    /dispositivos          → lista (filtrável)
 * POST   /dispositivos          → cria
 * GET    /dispositivos/:id      → ficha completa
 * PATCH  /dispositivos/:id      → atualiza
 * DELETE /dispositivos/:id      → soft delete (ativo=false)
 */
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { carregarUsuarioEscopo, usuarioPodeEditarDispositivo, whereVeParceiro } from '../lib/escopo.js'
import { salvarFotoDispositivo, salvarDatasheetDispositivo } from '../lib/storage.js'

/**
 * `fotoUrl` aceita URL absoluta OU caminho servido por nós (`/uploads/...`).
 * Só `.url()` impediria a foto enviada pelo próprio sistema de ser gravada.
 */
const fotoUrlSchema = z
  .string()
  .refine(
    (v) => v.startsWith('/uploads/') || /^https?:\/\//.test(v),
    'Deve ser uma URL http(s) ou um caminho em /uploads/',
  )

const criarDispositivoSchema = z.object({
  categoriaId: z.string(),
  fabricante: z.string().default('Fabricante'),
  modelo: z.string().default('Modelo'),
  nomeComercial: z.string().default('Dispositivo'),
  fotoUrl: fotoUrlSchema.optional().nullable(),
  linkFabricante: z.string().optional().nullable(),
})

const TIPOS_IMAGEM: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
}

const dispositivoRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /dispositivos
  fastify.get('/dispositivos', {
    onRequest: [fastify.autenticar],
  }, async (request) => {
    const { categoriaId, fabricante, busca, ativo } = request.query as {
      categoriaId?: string
      fabricante?: string
      busca?: string
      ativo?: string
    }

    // Parceiro só enxerga dispositivos com homologação ao seu alcance
    const escopoParceiro = request.user.papel === 'PARCEIRO'
      ? { homologacoes: { some: whereVeParceiro(await carregarUsuarioEscopo(fastify.prisma, request.user)) } }
      : {}

    return fastify.prisma.dispositivo.findMany({
      where: {
        ...escopoParceiro,
        ativo: ativo === 'false' && request.user.papel !== 'PARCEIRO' ? false : true,
        ...(categoriaId ? { categoriaId } : {}),
        ...(fabricante ? { fabricante: { contains: fabricante, mode: 'insensitive' } } : {}),
        ...(busca ? {
          OR: [
            { fabricante: { contains: busca, mode: 'insensitive' } },
            { modelo: { contains: busca, mode: 'insensitive' } },
            { nomeComercial: { contains: busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        categoria: { select: { id: true, nome: true, slug: true, icone: true } },
        _count: { select: { homologacoes: true } },
      },
      orderBy: [{ fabricante: 'asc' }, { modelo: 'asc' }],
    })
  })

  // POST /dispositivos
  fastify.post('/dispositivos', {
    onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR'])],
  }, async (request, reply) => {
    const body = criarDispositivoSchema.parse(request.body)
    const fabricante = body.fabricante || 'Fabricante'
    const modelo = body.modelo || 'Modelo'
    const nomeComercial = body.nomeComercial || `${fabricante} ${modelo}`.trim() || 'Dispositivo'

    try {
      const dispositivo = await fastify.prisma.dispositivo.create({
        data: {
          categoriaId: body.categoriaId,
          fabricante,
          modelo,
          nomeComercial,
          fotoUrl: body.fotoUrl ?? null,
          linkFabricante: body.linkFabricante ?? null,
        },
        include: { categoria: true },
      })
      return reply.status(201).send(dispositivo)
    } catch (e: any) {
      fastify.log.error(e)
      if (e.code === 'P2002') {
        return reply.status(409).send({ erro: 'Já existe um dispositivo com esse fabricante e modelo.' })
      }
      if (e.code === 'P2003') {
        return reply.status(400).send({ erro: 'Categoria de dispositivo inválida ou inexistente.' })
      }
      return reply.status(400).send({
        erro: e?.message || 'Não foi possível cadastrar o dispositivo.',
      })
    }
  })

  // GET /dispositivos/fabricantes — lista de fabricantes distintos para filtros
  fastify.get('/dispositivos/fabricantes', {
    onRequest: [fastify.autenticar],
  }, async (request) => {
    // Parceiro só recebe fabricantes do que ele enxerga — a lista inteira
    // revelaria modelos de outros parceiros
    const escopoParceiro = request.user.papel === 'PARCEIRO'
      ? { homologacoes: { some: whereVeParceiro(await carregarUsuarioEscopo(fastify.prisma, request.user)) } }
      : {}
    const resultados = await fastify.prisma.dispositivo.findMany({
      where: { ativo: true, ...escopoParceiro },
      select: { fabricante: true },
      distinct: ['fabricante'],
      orderBy: { fabricante: 'asc' },
    })
    return resultados.map(r => r.fabricante)
  })

  // GET /dispositivos/:id
  fastify.get('/dispositivos/:id', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const escopoHomologacao = request.user.papel === 'PARCEIRO'
      ? whereVeParceiro(await carregarUsuarioEscopo(fastify.prisma, request.user))
      : undefined
    const dispositivo = await fastify.prisma.dispositivo.findUnique({
      where: { id },
      include: {
        categoria: true,
        homologacoes: {
          where: escopoHomologacao,
          include: {
            bateria: { select: { id: true, nome: true } },
            responsavel: { select: { id: true, nome: true, email: true } },
            _count: { select: { resultados: true } },
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    })

    if (!dispositivo) return reply.status(404).send({ erro: 'Dispositivo não encontrado' })
    if (escopoHomologacao && dispositivo.homologacoes.length === 0) {
      return reply.status(404).send({ erro: 'Dispositivo não encontrado' })
    }
    return dispositivo
  })

  // PATCH /dispositivos/:id
  fastify.patch('/dispositivos/:id', {
    onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR', 'PARCEIRO'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = criarDispositivoSchema.partial().parse(request.body)

    const existe = await fastify.prisma.dispositivo.findUnique({ where: { id }, select: { id: true } })
    if (!existe) return reply.status(404).send({ erro: 'Dispositivo não encontrado' })

    // Parceiro edita o cadastro (nome, fabricante, foto…) só de modelo da
    // planilha da empresa dele, enquanto a homologação está com ele. Mudar o
    // tipo do dispositivo tira a coluna de uma matriz e põe em outra: só a
    // Mobiltec faz.
    if (request.user.papel === 'PARCEIRO') {
      if (body.categoriaId !== undefined) {
        return reply.status(403).send({ erro: 'Somente a Mobiltec altera o tipo de um dispositivo.' })
      }
      if (!(await usuarioPodeEditarDispositivo(fastify.prisma, request.user, id))) {
        return reply.status(403).send({
          erro: 'Parceiros só editam dispositivos da própria empresa com homologação em rascunho ou revisão.',
        })
      }
    }

    const { categoriaId, ...dadosAtualizacao } = body
    const dispositivo = await fastify.prisma.dispositivo.update({
      where: { id },
      data: {
        ...dadosAtualizacao,
        ...(categoriaId ? { categoria: { connect: { id: categoriaId } } } : {}),
      },
    })
    return dispositivo
  })

  // ============================================================
  // POST /dispositivos/:id/foto — upload da foto usada no certificado
  // ============================================================
  fastify.post('/dispositivos/:id/foto', {
    onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR', 'PARCEIRO'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const dispositivo = await fastify.prisma.dispositivo.findUnique({ where: { id } })
    if (!dispositivo) return reply.status(404).send({ erro: 'Dispositivo não encontrado' })

    if (!(await usuarioPodeEditarDispositivo(fastify.prisma, request.user, id))) {
      return reply.status(403).send({
        erro: 'Parceiros só alteram a foto de dispositivos da própria empresa com homologação em rascunho ou revisão.',
      })
    }

    let arquivo
    try {
      arquivo = await request.file({ limits: { fileSize: 8 * 1024 * 1024 } })
    } catch {
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 8 MB.' })
    }
    if (!arquivo) return reply.status(400).send({ erro: 'Nenhum arquivo enviado.' })

    const extensao = TIPOS_IMAGEM[arquivo.mimetype]
    if (!extensao) {
      return reply.status(415).send({
        erro: `Formato não suportado: ${arquivo.mimetype}. Use PNG, JPEG ou WebP.`,
      })
    }

    let conteudo: Buffer
    try {
      conteudo = await arquivo.toBuffer()
    } catch {
      // O @fastify/multipart lança quando o arquivo estoura o limite configurado
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 8 MB.' })
    }

    if (arquivo.file.truncated || conteudo.length > 8 * 1024 * 1024) {
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 8 MB.' })
    }

    const fotoUrl = await salvarFotoDispositivo(id, extensao, conteudo, arquivo.mimetype)

    return fastify.prisma.dispositivo.update({
      where: { id },
      data: { fotoUrl },
    })
  })

  // POST /dispositivos/:id/datasheet — Upload de datasheet PDF (Admin/Mobiltec)
  fastify.post('/dispositivos/:id/datasheet', {
    onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const dispositivo = await fastify.prisma.dispositivo.findUnique({
      where: { id },
      select: { id: true, modelo: true, fabricante: true },
    })

    if (!dispositivo) {
      return reply.status(404).send({ erro: 'Dispositivo não encontrado.' })
    }

    let arquivo
    try {
      arquivo = await request.file({ limits: { fileSize: 15 * 1024 * 1024 } })
    } catch {
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 15 MB.' })
    }
    if (!arquivo) return reply.status(400).send({ erro: 'Nenhum arquivo enviado.' })

    const ehPdf = arquivo.mimetype === 'application/pdf' || arquivo.filename.toLowerCase().endsWith('.pdf')
    if (!ehPdf) {
      return reply.status(415).send({
        erro: 'Formato não suportado. O datasheet deve ser um arquivo PDF.',
      })
    }

    let conteudo: Buffer
    try {
      conteudo = await arquivo.toBuffer()
    } catch {
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 15 MB.' })
    }

    if (arquivo.file.truncated || conteudo.length > 15 * 1024 * 1024) {
      return reply.status(413).send({ erro: 'Arquivo muito grande. O limite é 15 MB.' })
    }

    const datasheetUrl = await salvarDatasheetDispositivo(id, conteudo)

    return fastify.prisma.dispositivo.update({
      where: { id },
      data: { datasheetUrl },
    })
  })

  // DELETE /dispositivos/:id (soft delete)
  fastify.delete('/dispositivos/:id', {
    onRequest: [fastify.exigirPapeis(['ADMIN', 'HOMOLOGADOR'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await fastify.prisma.dispositivo.update({
      where: { id },
      data: { ativo: false },
    })
    return reply.status(204).send()
  })
}

export default dispositivoRoutes
