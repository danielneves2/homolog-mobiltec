import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/contextos/AuthContext'

/** Manda para /login guardando a rota pretendida, para voltar depois do login. */
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { autenticado } = useAuth()
  const localizacao = useLocation()

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: localizacao.pathname + localizacao.search }} />
  }

  return <>{children}</>
}
