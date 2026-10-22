import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, sessao, EVENTO_NAO_AUTORIZADO } from '@/lib/api'
import type { Usuario } from '@/lib/tipos'

interface RespostaLogin {
  token: string
  usuario: Usuario
}

interface ValorAuth {
  usuario: Usuario | null
  autenticado: boolean
  ehMobiltec: boolean
  ehParceiro: boolean
  ehAdmin: boolean
  ehLeitor: boolean
  podeEditar: boolean
  podeEmitirCertificado: boolean
  podeJustificar: boolean
  /** D500: parceiro com permissão de configurar o ambiente da empresa */
  podeConfigurarAmbiente: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
  /** Relê /auth/me — matrizes visíveis e permissões mudam sem novo login (D499/D500) */
  recarregarUsuario: () => Promise<void>
}

const AuthContext = createContext<ValorAuth | null>(null)

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => sessao.obterUsuario())
  // O cache de consultas é da sessão: trocar de conta na mesma aba não pode
  // mostrar a lista de parceiros, o painel ou a matriz do usuário anterior
  const qc = useQueryClient()

  const sair = useCallback(() => {
    sessao.limpar()
    qc.clear()
    setUsuario(null)
  }, [qc])

  // O token expira em 8h; quando o backend devolve 401, o api.ts avisa por evento.
  useEffect(() => {
    const aoExpirar = () => {
      qc.clear()
      setUsuario(null)
    }
    window.addEventListener(EVENTO_NAO_AUTORIZADO, aoExpirar)
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, aoExpirar)
  }, [qc])

  const recarregarUsuario = useCallback(async () => {
    const token = sessao.obterToken()
    if (!token) return
    try {
      const atual = await api.get<Usuario>('/auth/me')
      if (!atual) return
      sessao.salvar(token, atual)
      setUsuario(atual)
    } catch {
      /* sem rede: segue com o usuário em cache; 401 já desloga pelo evento */
    }
  }, [])

  // A sessão em cache pode ter a lista de matrizes antiga: relê uma vez ao abrir
  useEffect(() => {
    if (sessao.obterToken()) void recarregarUsuario()
  }, [recarregarUsuario])

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api.post<RespostaLogin>('/auth/login', { email, senha }, { semAuth: true })
    sessao.salvar(resposta.token, resposta.usuario)
    qc.clear()
    setUsuario(resposta.usuario)
  }, [qc])

  const ehMobiltec = usuario?.papel === 'ADMIN' || usuario?.papel === 'HOMOLOGADOR'
  const ehParceiro = usuario?.papel === 'PARCEIRO'
  const ehAdmin = usuario?.papel === 'ADMIN'
  const ehLeitor = usuario?.papel === 'LEITOR'
  const podeEditar = ehMobiltec || ehParceiro
  const podeConfigurarAmbiente = ehParceiro && Boolean(usuario?.podeConfigurarAmbiente)

  const valor = useMemo<ValorAuth>(
    () => ({
      usuario,
      autenticado: usuario !== null,
      ehMobiltec,
      ehParceiro,
      ehAdmin,
      ehLeitor,
      podeEditar,
      podeEmitirCertificado: ehMobiltec,
      podeJustificar: ehMobiltec,
      podeConfigurarAmbiente,
      entrar,
      sair,
      recarregarUsuario,
    }),
    [usuario, ehMobiltec, ehParceiro, ehAdmin, ehLeitor, podeEditar, podeConfigurarAmbiente, entrar, sair, recarregarUsuario],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): ValorAuth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>')
  return ctx
}
