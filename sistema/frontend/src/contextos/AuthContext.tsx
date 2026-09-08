import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, sessao, EVENTO_NAO_AUTORIZADO } from '@/lib/api'
import type { Usuario } from '@/lib/tipos'

interface RespostaLogin {
  token: string
  usuario: Usuario
}

interface ValorAuth {
  usuario: Usuario | null
  autenticado: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<ValorAuth | null>(null)

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => sessao.obterUsuario())

  const sair = useCallback(() => {
    sessao.limpar()
    setUsuario(null)
  }, [])

  // O token expira em 8h; quando o backend devolve 401, o api.ts avisa por evento.
  useEffect(() => {
    const aoExpirar = () => setUsuario(null)
    window.addEventListener(EVENTO_NAO_AUTORIZADO, aoExpirar)
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, aoExpirar)
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api.post<RespostaLogin>('/auth/login', { email, senha }, { semAuth: true })
    sessao.salvar(resposta.token, resposta.usuario)
    setUsuario(resposta.usuario)
  }, [])

  const valor = useMemo<ValorAuth>(
    () => ({ usuario, autenticado: usuario !== null, entrar, sair }),
    [usuario, entrar, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): ValorAuth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>')
  return ctx
}
