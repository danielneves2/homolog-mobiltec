/**
 * Plugin de autenticação JWT para Fastify
 */
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    autenticar: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; papel: string }
    user: { id: string; email: string; papel: string }
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'segredo_dev',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
  })

  fastify.decorate('autenticar', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ erro: 'Token inválido ou expirado' })
    }
  })
}

export default fp(jwtPlugin, { name: 'jwt' })
