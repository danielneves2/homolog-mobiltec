/**
 * Servidor Fastify principal
 */
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import estatico from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

import jwtPlugin from './plugins/jwt.js'
import prismaPlugin from './plugins/prisma.js'
import { registrarErrorHandler } from './middlewares/error-handler.js'
import authRoutes from './routes/auth.js'
import dispositivoRoutes from './routes/dispositivos.js'
import catalogoRoutes from './routes/catalogo.js'
import homologacaoRoutes from './routes/homologacoes.js'
import matrizRoutes from './routes/matriz.js'
import tiposDispositivoRoutes from './routes/tipos-dispositivo.js'
import certificadoRoutes from './routes/certificados.js'
import vitrineRoutes from './routes/vitrine.js'

const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

async function start() {
  registrarErrorHandler(fastify)

  // Plugins de infraestrutura
  // O navegador só fala com o Vite, que faz o proxy de `/api` daqui do lado
  // do servidor — por isso o CORS não entra em jogo nem quando a interface é
  // aberta pelo IP da rede local. O valor abaixo é a porta do Vite, para
  // quando alguém chamar a API direto do navegador em desenvolvimento.
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
    credentials: true,
  })
  await fastify.register(prismaPlugin)
  await fastify.register(jwtPlugin)

  // Arquivos gerados (certificados emitidos, fotos de dispositivo).
  // Servidos sem auth: o caminho contém o UUID da homologação, que já não é
  // adivinhável — trocar por URL assinada se o portal externo da Fase 3 sair.
  const dirUploads = path.resolve(process.env.UPLOAD_DIR ?? './uploads')
  mkdirSync(dirUploads, { recursive: true })
  await fastify.register(estatico, { root: dirUploads, prefix: '/uploads/' })

  // Foto do dispositivo: entra no certificado, então 8 MB cobre com folga
  // qualquer foto de catálogo de fabricante.
  await fastify.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } })

  // Rotas
  await fastify.register(authRoutes)
  await fastify.register(dispositivoRoutes)
  await fastify.register(catalogoRoutes)
  await fastify.register(homologacaoRoutes)
  await fastify.register(matrizRoutes)
  await fastify.register(tiposDispositivoRoutes)
  await fastify.register(certificadoRoutes)
  await fastify.register(vitrineRoutes)

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  const port = parseInt(process.env.PORT ?? '3001')
  await fastify.listen({ port, host: '0.0.0.0' })
  console.log(`\n🚀 Servidor rodando em http://localhost:${port}`)
}

start().catch((err) => {
  fastify.log.error(err)
  process.exit(1)
})
