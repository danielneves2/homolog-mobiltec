import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProvedorAuth } from '@/contextos/AuthContext'
import { RotaProtegida } from '@/componentes/RotaProtegida'
import { Layout } from '@/componentes/Layout'
import { Login } from '@/paginas/Login'
import { Matriz } from '@/paginas/Matriz'
import { RegistroDispositivo } from '@/paginas/RegistroDispositivo'
import { GerenciarTipos } from '@/paginas/GerenciarTipos'
import { Home } from '@/paginas/Home'
import { DetalheDispositivo } from '@/paginas/DetalheDispositivo'
import { Certificado } from '@/paginas/Certificado'
import { GerenciarParceiros } from '@/paginas/GerenciarParceiros'

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados de homologação mudam pouco durante uma sessão de teste;
      // refetch agressivo atrapalharia o autosave do checklist.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter>
        <ProvedorAuth>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* O certificado ocupa a tela toda: é a prévia de um documento. */}
            <Route
              path="/homologacoes/:id/certificado"
              element={
                <RotaProtegida>
                  <Certificado />
                </RotaProtegida>
              }
            />

            <Route
              element={
                <RotaProtegida>
                  <Layout />
                </RotaProtegida>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/dispositivos/:id" element={<DetalheDispositivo />} />
              {/* Uma matriz por categoria de dispositivo */}
              <Route path="/matriz/:slug" element={<Matriz />} />
              <Route path="/matriz" element={<Navigate to="/matriz/pos" replace />} />
              {/* De onde saem as categorias do menu: cria o tipo e a bateria
                  dele, lista o que existe e edita ou remove */}
              <Route path="/registro" element={<RegistroDispositivo />} />
              <Route path="/registro/tipos" element={<GerenciarTipos />} />
              <Route path="/registro/tipos/:id" element={<RegistroDispositivo />} />
              {/* Gestão de Ambiente e Parceiros (apenas Admin) */}
              <Route path="/ambiente/parceiros" element={<GerenciarParceiros />} />
              <Route path="/ambiente" element={<Navigate to="/ambiente/parceiros" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProvedorAuth>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
