/**
 * Plugin Prisma — instância singleton do PrismaClient
 */
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

  await prisma.$connect()
  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (server) => {
    await server.prisma.$disconnect()
  })
}

export default fp(prismaPlugin, { name: 'prisma' })
