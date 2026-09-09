/**
 * Rota de autenticação
 * POST /auth/login  → retorna JWT
 * GET  /auth/me     → retorna usuário logado
 */
import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { ehDominioOficial } from '../lib/dominios.js'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const usuario = await fastify.prisma.usuario.findUnique({
      where: { email: body.email },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(401).send({ erro: 'Credenciais inválidas' })
    }

    // SEGURANÇA: Validar senha ANTES de verificar domínio para não expor
    // information disclosure (resposta diferente revela existência de conta).
    const senhaValida = await bcrypt.compare(body.senha, usuario.senhaHash)
    if (!senhaValida) {
      return reply.status(401).send({ erro: 'Credenciais inválidas' })
    }

    // Regra: Papéis administrativos (ADMIN / HOMOLOGADOR) exigem domínio oficial Mobiltec.
    // Só checamos aqui (após senha validada) para não diferenciar "conta inexistente"
    // de "conta com domínio inválido" — ambas retornariam 401 antes.
    if ((usuario.papel === 'ADMIN' || usuario.papel === 'HOMOLOGADOR') && !ehDominioOficial(usuario.email)) {
      return reply.status(403).send({
        erro: 'Acesso administrativo restrito a contas com domínio oficial @mobiltec.com.br',
      })
    }

    const token = fastify.jwt.sign({
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
    })

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        papel: usuario.papel,
        empresa: usuario.empresa,
        categoriasPermitidas: usuario.categoriasPermitidas,
      },
    }
  })

  // GET /auth/me
  fastify.get('/auth/me', {
    onRequest: [fastify.autenticar],
  }, async (request) => {
    const usuario = await fastify.prisma.usuario.findUnique({
      where: { id: request.user.id },
      select: { id: true, nome: true, email: true, cargo: true, papel: true, empresa: true, categoriasPermitidas: true },
    })
    return usuario
  })
}

export default authRoutes
