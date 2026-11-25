import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { Home } from '@/paginas/Home'

/**
 * Painel de entrada (D530).
 *
 * O Painel Mobiltec é da Mobiltec. O parceiro tem só o painel individual da
 * própria empresa: quem chega a `/` ou `/paineis/mobiltec` (login, logo,
 * "voltar", link antigo) cai nele.
 */
export function PainelInicial() {
  const { ehParceiro } = useAuth()
  if (ehParceiro) return <Navigate to="/paineis/meu-painel" replace />
  return <Home />
}
