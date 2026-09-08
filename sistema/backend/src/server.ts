/**
 * Servidor Fastify principal (desenvolvimento / container standalone)
 */
import { criarApp } from './app.js'

async function start() {
  const app = await criarApp()
  const port = parseInt(process.env.PORT ?? '3001')
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`\n🚀 Servidor rodando em http://localhost:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
