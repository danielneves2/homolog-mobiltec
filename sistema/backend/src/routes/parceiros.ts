import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const parceiroInputSchema = z.object({
  empresa: z.string().min(1, 'Nome do parceiro/empresa é obrigatório'),
  nome: z.string().min(1, 'Nome do responsável é obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  categoriasPermitidas: z.array(z.string()).default([]),
})

const parceiroUpdateSchema = z.object({
  empresa: z.string().min(1).optional(),
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  categoriasPermitidas: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
})

const parceirosRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /parceiros — Lista todos os parceiros cadastrados (apenas ADMIN)
  fastify.get(
    '/parceiros',
    { onRequest: [fastify.autenticar] },
    async (request, reply) => {
      if (request.user.papel !== 'ADMIN') {
        return reply.status(403).send({ erro: 'Acesso restrito a administradores' })
      }

      const parceiros = await fastify.prisma.usuario.findMany({
        where: { papel: 'PARCEIRO' },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          papel: true,
          empresa: true,
          categoriasPermitidas: true,
          ativo: true,
          criadoEm: true,
        },
        orderBy: { criadoEm: 'desc' },
      })

      return parceiros
    },
  )

  // POST /parceiros — Cadastra novo parceiro (apenas ADMIN)
  fastify.post(
    '/parceiros',
    { onRequest: [fastify.autenticar] },
    async (request, reply) => {
      if (request.user.papel !== 'ADMIN') {
        return reply.status(403).send({ erro: 'Acesso restrito a administradores' })
      }

      const body = parceiroInputSchema.parse(request.body)

      const existente = await fastify.prisma.usuario.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      })

      if (existente) {
        return reply.status(409).send({ erro: 'Já existe um usuário cadastrado com este e-mail' })
      }

      const senhaHash = await bcrypt.hash(body.senha, 10)
      const dominioCorporativo = body.email.split('@')[1]?.toLowerCase() ?? null

      const parceiro = await fastify.prisma.usuario.create({
        data: {
          nome: body.nome.trim(),
          email: body.email.toLowerCase().trim(),
          cargo: 'Parceiro Homologador',
          senhaHash,
          papel: 'PARCEIRO',
          empresa: body.empresa.trim(),
          dominioCorporativo,
          categoriasPermitidas: body.categoriasPermitidas,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          papel: true,
          empresa: true,
          categoriasPermitidas: true,
          ativo: true,
          criadoEm: true,
        },
      })

      return reply.status(201).send(parceiro)
    },
  )

  // PUT /parceiros/:id — Atualiza dados do parceiro (apenas ADMIN)
  fastify.put(
    '/parceiros/:id',
    { onRequest: [fastify.autenticar] },
    async (request, reply) => {
      if (request.user.papel !== 'ADMIN') {
        return reply.status(403).send({ erro: 'Acesso restrito a administradores' })
      }

      const { id } = request.params as { id: string }
      const body = parceiroUpdateSchema.parse(request.body)

      const dados: Record<string, unknown> = {}
      if (body.empresa !== undefined) dados.empresa = body.empresa.trim()
      if (body.nome !== undefined) dados.nome = body.nome.trim()
      if (body.email !== undefined) {
        dados.email = body.email.toLowerCase().trim()
        dados.dominioCorporativo = body.email.split('@')[1]?.toLowerCase() ?? null
      }
      if (body.senha !== undefined && body.senha.length >= 6) {
        dados.senhaHash = await bcrypt.hash(body.senha, 10)
      }
      if (body.categoriasPermitidas !== undefined) {
        dados.categoriasPermitidas = body.categoriasPermitidas
      }
      if (body.ativo !== undefined) {
        dados.ativo = body.ativo
      }

      try {
        const atualizado = await fastify.prisma.usuario.update({
          where: { id },
          data: dados,
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            papel: true,
            empresa: true,
            categoriasPermitidas: true,
            ativo: true,
            criadoEm: true,
          },
        })

        return atualizado
      } catch (err: any) {
        if (err.code === 'P2025') {
          return reply.status(404).send({ erro: 'Parceiro não encontrado' })
        }
        if (err.code === 'P2002') {
          return reply.status(409).send({ erro: 'Já existe outro usuário com este e-mail' })
        }
        throw err
      }
    },
  )

  // DELETE /parceiros/:id — Inativação de parceiro (apenas ADMIN)
  fastify.delete(
    '/parceiros/:id',
    { onRequest: [fastify.autenticar] },
    async (request, reply) => {
      if (request.user.papel !== 'ADMIN') {
        return reply.status(403).send({ erro: 'Acesso restrito a administradores' })
      }

      const { id } = request.params as { id: string }

      try {
        await fastify.prisma.usuario.update({
          where: { id },
          data: { ativo: false },
        })

        return { ok: true }
      } catch (err: any) {
        if (err.code === 'P2025') {
          return reply.status(404).send({ erro: 'Parceiro não encontrado' })
        }
        throw err
      }
    },
  )
}

export default parceirosRoutes
