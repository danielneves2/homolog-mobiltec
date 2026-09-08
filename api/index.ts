import type { IncomingMessage, ServerResponse } from 'node:http'
import { criarApp } from '../sistema/backend/src/app.js'

let appPromise: any = null

async function getApp() {
  if (!appPromise) {
    appPromise = criarApp().then(async (app) => {
      await app.ready()
      return app
    })
  }
  return appPromise
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp()

  // Normaliza o caminho: remove o prefixo /api para mapear diretamente às rotas Fastify
  if (req.url?.startsWith('/api/')) {
    req.url = req.url.slice(4)
  } else if (req.url === '/api') {
    req.url = '/'
  }

  app.server.emit('request', req, res)
}
