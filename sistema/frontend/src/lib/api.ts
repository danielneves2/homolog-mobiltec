/**
 * Cliente HTTP.
 *
 * Fala com o backend via proxy do Vite (`/api` → localhost:3001), então não há
 * base URL nem CORS em dev.
 *
 * O backend responde erro sempre no formato { erro, campos? } — ver o
 * error-handler global. `ErroApi` preserva o status e os campos para que a UI
 * possa tratar cada caso (422 da regra central, 403 de somente-leitura…).
 */
import type { Usuario } from './tipos'

const CHAVE_TOKEN = 'homolog.token'
const CHAVE_USUARIO = 'homolog.usuario'

export interface CampoInvalido {
  campo: string
  mensagem: string
}

export class ErroApi extends Error {
  status: number
  campos?: CampoInvalido[]
  /** Corpo bruto — algumas rotas mandam extras (ex.: transicoesPermitidas) */
  corpo: Record<string, unknown>

  constructor(status: number, corpo: Record<string, unknown>) {
    super((corpo?.erro as string) ?? `Erro ${status}`)
    this.name = 'ErroApi'
    this.status = status
    this.campos = corpo?.campos as CampoInvalido[] | undefined
    this.corpo = corpo ?? {}
  }

  /** 422 da regra central: status exige justificativa (spec §5) */
  get ehFaltaJustificativa(): boolean {
    return this.status === 422 && this.corpo.campo === 'justificativa'
  }

  /** 403: homologação aprovada é somente-leitura */
  get ehSomenteLeitura(): boolean {
    return this.status === 403
  }
}

// ------------------------------------------------------------
// Sessão
// ------------------------------------------------------------

export const sessao = {
  obterToken(): string | null {
    try {
      return localStorage.getItem(CHAVE_TOKEN)
    } catch {
      return null
    }
  },

  obterUsuario(): Usuario | null {
    try {
      const cru = localStorage.getItem(CHAVE_USUARIO)
      return cru ? (JSON.parse(cru) as Usuario) : null
    } catch {
      return null
    }
  },

  salvar(token: string, usuario: Usuario) {
    try {
      localStorage.setItem(CHAVE_TOKEN, token)
      localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario))
    } catch {
      /* modo privado / storage bloqueado — a sessão vive só em memória */
    }
  },

  limpar() {
    try {
      localStorage.removeItem(CHAVE_TOKEN)
      localStorage.removeItem(CHAVE_USUARIO)
    } catch {
      /* idem */
    }
  },
}

/** Disparado quando o backend devolve 401 — o AuthContext escuta e desloga. */
export const EVENTO_NAO_AUTORIZADO = 'homolog:nao-autorizado'

// ------------------------------------------------------------
// Requisição
// ------------------------------------------------------------

async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit & { semAuth?: boolean } = {},
): Promise<T> {
  const { semAuth, ...init } = opcoes
  const cabecalhos = new Headers(init.headers)

  // FormData define o próprio Content-Type, com o boundary — sobrescrever quebra o upload.
  if (init.body && !(init.body instanceof FormData) && !cabecalhos.has('Content-Type')) {
    cabecalhos.set('Content-Type', 'application/json')
  }
  if (!semAuth) {
    const token = sessao.obterToken()
    if (token) cabecalhos.set('Authorization', `Bearer ${token}`)
  }

  const resposta = await fetch(`/api${caminho}`, { ...init, headers: cabecalhos })

  if (resposta.status === 204) return undefined as T

  const texto = await resposta.text()
  let corpo: unknown = null
  if (texto) {
    try {
      corpo = JSON.parse(texto)
    } catch {
      corpo = { erro: texto }
    }
  }

  if (!resposta.ok) {
    // Token expirado (8h) ou inválido — derruba a sessão.
    if (resposta.status === 401 && !semAuth) {
      sessao.limpar()
      window.dispatchEvent(new CustomEvent(EVENTO_NAO_AUTORIZADO))
    }
    throw new ErroApi(resposta.status, (corpo ?? {}) as Record<string, unknown>)
  }

  return corpo as T
}

function comQuery(caminho: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (!params) return caminho
  const q = new URLSearchParams()
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== null && valor !== undefined && valor !== '') q.set(chave, String(valor))
  }
  const s = q.toString()
  return s ? `${caminho}?${s}` : caminho
}

/** Busca conteúdo bruto (HTML do preview, PDF…), que não passa por JSON. */
async function requisitarBruto(caminho: string, tipo: 'text' | 'blob') {
  const cabecalhos = new Headers()
  const token = sessao.obterToken()
  if (token) cabecalhos.set('Authorization', `Bearer ${token}`)

  const resposta = await fetch(`/api${caminho}`, { headers: cabecalhos })

  if (!resposta.ok) {
    if (resposta.status === 401) {
      sessao.limpar()
      window.dispatchEvent(new CustomEvent(EVENTO_NAO_AUTORIZADO))
    }
    let corpo: Record<string, unknown> = {}
    try {
      corpo = await resposta.json()
    } catch {
      /* resposta sem JSON */
    }
    throw new ErroApi(resposta.status, corpo)
  }

  return tipo === 'text' ? resposta.text() : resposta.blob()
}

export const api = {
  get: <T>(caminho: string, params?: Record<string, string | number | boolean | null | undefined>) =>
    requisitar<T>(comQuery(caminho, params)),

  getTexto: (caminho: string) => requisitarBruto(caminho, 'text') as Promise<string>,

  getBlob: (caminho: string) => requisitarBruto(caminho, 'blob') as Promise<Blob>,

  post: <T>(caminho: string, corpo?: unknown, opcoes?: { semAuth?: boolean }) =>
    requisitar<T>(caminho, {
      method: 'POST',
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      ...opcoes,
    }),

  /** Upload de arquivo. Sem Content-Type: o browser precisa definir o boundary. */
  postMultipart: <T>(caminho: string, dados: FormData) =>
    requisitar<T>(caminho, { method: 'POST', body: dados }),

  put: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, {
      method: 'PUT',
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),

  patch: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, {
      method: 'PATCH',
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),

  delete: <T>(caminho: string) => requisitar<T>(caminho, { method: 'DELETE' }),
}
