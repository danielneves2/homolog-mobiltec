import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { useCategorias } from '@/hooks/useVitrine'
import { useListaHomologacoes } from '@/hooks/useHomologacao'
import { useParceiros } from '@/hooks/useParceiros'
import { LogoMobiltec } from './LogoMobiltec'
import { Icone, iconeDaCategoria, type NomeIcone } from './Icone'
import { CentralNotificacoes } from './CentralNotificacoes'
import { useNotificacoes } from '@/hooks/useNotificacoes'

const CHAVE_MENU = 'homolog.menu-aberto'

interface ItemMenuDados {
  para: string
  rotulo: string
  icone: NomeIcone
  fim: boolean
}

/**
 * Gaveta do menu recolhido.
 *
 * Com o menu em 64px não há onde desdobrar um grupo. Passar o mouse num ícone
 * faz sair de dentro do trilho uma gaveta branca com as opções, por cima do
 * conteúdo; tirar o mouse a recolhe. Clicar no ícone também abre/fecha (toque).
 * A gaveta é uma só; quem a preenche (por portal) é o grupo ativo.
 */
interface ContextoSecundario {
  /** Grupo com a gaveta aberta (null = fechada) */
  ativo: string | null
  /** Grupo cujo conteúdo está na gaveta — continua durante a animação de fechar */
  conteudo: string | null
  slot: HTMLElement | null
  abrir: (chave: string) => void
  fechar: () => void
  /** Fecha com um respiro, para o mouse cruzar do ícone até a gaveta */
  agendarFechar: () => void
  cancelarFechar: () => void
}

const SecundarioCtx = createContext<ContextoSecundario>({
  ativo: null,
  conteudo: null,
  slot: null,
  abrir: () => {},
  fechar: () => {},
  agendarFechar: () => {},
  cancelarFechar: () => {},
})

/**
 * Menu aberto: conta as saídas do mouse do menu. Grupos abertos por hover só
 * recolhem quando isso acontece — nunca ao passar de um grupo para outro.
 */
const SaidaNavCtx = createContext(0)

/** Pausa do mouse sobre um grupo antes de desdobrá-lo (menu aberto) */
const ATRASO_ABRIR_HOVER = 180

/** Moldura da gaveta: título do grupo e as opções */
function ConteudoSecundario({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <div className="painel-secundario-cabecalho">{titulo}</div>
      <div className="painel-secundario-lista">{children}</div>
    </>
  )
}

/** Opção da coluna secundária */
function ItemSecundario({
  para,
  fim,
  icone,
  rotulo,
  selo = 0,
  corSelo,
  aoClicar,
}: {
  para: string
  fim?: boolean
  icone?: NomeIcone
  rotulo: string
  selo?: number
  corSelo?: string
  aoClicar?: () => void
}) {
  const { fechar } = useContext(SecundarioCtx)
  return (
    <NavLink
      to={para}
      end={fim}
      onClick={() => {
        aoClicar?.()
        fechar()
      }}
      className={({ isActive }) => `item-secundario${isActive ? ' item-secundario-ativo' : ''}`}
    >
      {icone && <Icone nome={icone} className="h-4 w-4 shrink-0 opacity-80" />}
      <span className="flex-1 truncate">{rotulo}</span>
      {selo > 0 && (
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
          style={{ background: corSelo ?? 'var(--gradient-brand-purple)' }}
        >
          {selo}
        </span>
      )}
    </NavLink>
  )
}

/**
 * Bloco de opções dentro de um grupo. Com `titulo`, ganha um subtítulo; sem
 * ele, é uma opção solta (ex.: Configurar dispositivos). Seções são separadas
 * por uma linha sutil.
 */
interface SecaoMenu {
  titulo?: string
  itens: ItemMenuDados[]
}

/**
 * Item do menu que abre um grupo de opções, e não uma tela.
 *
 * Com o menu aberto o grupo se desdobra no lugar, recuado, ao passar o mouse
 * ou ao clicar (fixando o estado). Recolhido não há onde desdobrar — aí as
 * opções abrem na coluna secundária ao lado do trilho.
 */
function GrupoMenu({
  item,
  filhos: filhosSimples,
  secoes: secoesProp,
  tituloGaveta,
  aberto,
  totalPendentes = 0,
  comIcones = false,
  aoClicarItem,
}: {
  item: Omit<ItemMenuDados, 'fim'>
  /** Opções numa lista única */
  filhos?: ItemMenuDados[]
  /** Ou opções agrupadas em seções com subtítulo */
  secoes?: SecaoMenu[]
  /** Título da gaveta do menu recolhido (padrão: o rótulo do grupo) */
  tituloGaveta?: string
  aberto: boolean
  totalPendentes?: number
  /** Mostra o ícone de cada opção (os tipos de dispositivo) */
  comIcones?: boolean
  aoClicarItem?: (item: ItemMenuDados) => void
}) {
  const secoes: SecaoMenu[] = secoesProp ?? [{ itens: filhosSimples ?? [] }]
  const filhos = secoes.flatMap((sec) => sec.itens)
  const { pathname } = useLocation()
  const noGrupo = filhos.some((f) => pathname === f.para || pathname.startsWith(`${f.para}/`))
  const [expandido, setExpandido] = useState(noGrupo)
  const [emHover, setEmHover] = useState(false)
  const refTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const secundario = useContext(SecundarioCtx)
  const saidaNav = useContext(SaidaNavCtx)
  const chave = item.rotulo
  const secundarioAberto = !aberto && secundario.ativo === chave

  // Navegar para dentro do grupo o abre e o fixa aberto
  useEffect(() => {
    if (noGrupo) setExpandido(true)
  }, [noGrupo])

  // Recolher o menu fecha o desdobramento: ele não tem onde caber em 64px
  useEffect(() => {
    if (!aberto) {
      setExpandido(false)
      setEmHover(false)
    }
  }, [aberto])

  // Limpeza de timeout ao desmontar
  useEffect(() => {
    return () => {
      if (refTimeout.current) clearTimeout(refTimeout.current)
    }
  }, [])

  function aoEntrarMouse() {
    if (!aberto) {
      secundario.abrir(chave)
      return
    }
    // Intenção: só abre se o mouse parar no grupo. Passar por cima a caminho
    // de outro item não dispara nada.
    if (refTimeout.current) clearTimeout(refTimeout.current)
    refTimeout.current = setTimeout(() => setEmHover(true), ATRASO_ABRIR_HOVER)
  }

  function aoSairMouse() {
    if (!aberto) {
      secundario.agendarFechar()
      return
    }
    // Não fecha ao sair do grupo: recolher aqui puxaria os itens de baixo para
    // cima, sob o cursor, e abriria outro grupo sem querer. Quem recolhe é a
    // saída do mouse do menu inteiro (`saidaNav`).
    if (refTimeout.current) {
      clearTimeout(refTimeout.current)
      refTimeout.current = null
    }
  }

  // O mouse deixou o menu: recolhe o que foi aberto só pelo hover
  useEffect(() => {
    if (saidaNav > 0) setEmHover(false)
  }, [saidaNav])

  function alternar() {
    if (aberto) {
      setExpandido((v) => {
        const proximo = !v
        if (!proximo) setEmHover(false)
        return proximo
      })
      return
    }
    // Hover já abre; o clique garante a abertura no toque
    secundario.abrir(chave)
  }

  const abertoVisivel = expandido || emHover

  return (
    <div
      className="relative"
      onMouseEnter={aoEntrarMouse}
      onMouseLeave={aoSairMouse}
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto ? abertoVisivel : secundarioAberto}
        title={aberto ? undefined : item.rotulo}
        data-grupo-menu={item.rotulo}
        className={`btn-menu-lateral relative flex items-center select-none outline-none focus:outline-none focus-visible:outline-none ${
          aberto
            ? 'w-full gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium leading-tight'
            : 'mx-auto h-9 w-9 items-center justify-center rounded-lg'
        } ${
          noGrupo
            ? 'btn-menu-ativo text-white'
            : 'text-[var(--color-muted-foreground)]'
        } ${secundarioAberto ? 'btn-menu-secundario' : ''}`}
        style={{
          background: noGrupo ? 'var(--gradient-brand-purple)' : undefined,
          boxShadow: noGrupo ? '0 2px 6px -1px rgba(126, 32, 101, 0.35)' : undefined,
          justifyContent: aberto ? 'flex-start' : 'center',
        }}
      >
        <Icone nome={item.icone} className="h-[18px] w-[18px] shrink-0" />
        {!aberto && totalPendentes > 0 && (
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full ring-2 shadow-xs"
            style={{ background: '#F59E0B' }}
          />
        )}
        {aberto && (
          <>
            <span className="flex-1 truncate text-left">{item.rotulo}</span>
            {totalPendentes > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                style={{ background: noGrupo ? '#F59E0B' : 'var(--gradient-brand-purple)' }}
              >
                {totalPendentes}
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-75"
              style={{ transform: abertoVisivel ? 'rotate(180deg)' : 'none' }}
              aria-hidden
            >
              <path
                d="M4 6.5 8 10.5l4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {aberto && (
        <div
          className="menu-accordion-wrapper"
          data-aberto={abertoVisivel ? 'true' : 'false'}
        >
          <div className="menu-accordion-content">
            <div className="mt-1 ml-5 space-y-0.5">
              {secoes.map((sec, i) => (
                <div key={sec.titulo ?? sec.itens[0]?.para ?? i} className={i > 0 ? 'menu-secao-divisor' : undefined}>
                  {sec.titulo && <div className="menu-secao-titulo">{sec.titulo}</div>}
                  {sec.itens.map((f) => {
                    const isCertificado = f.para.includes('validar-certificados')
                    return (
                      <NavLink
                        key={f.para}
                        to={f.para}
                        end={f.fim}
                        onClick={() => aoClicarItem?.(f)}
                        className={({ isActive }) =>
                          `btn-menu-subitem flex items-center gap-2 truncate rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-tight outline-none focus:outline-none focus-visible:outline-none ${
                            isActive
                              ? 'btn-subitem-ativo bg-[var(--color-muted)] text-[var(--color-primary)] font-semibold'
                              : 'text-[var(--color-muted-foreground)]'
                          }`
                        }
                      >
                        {comIcones && <Icone nome={f.icone} className="h-[15px] w-[15px] shrink-0 opacity-80" />}
                        <span className="flex-1 truncate">{f.rotulo}</span>
                        {isCertificado && totalPendentes > 0 && (
                          <span
                            className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ background: 'var(--gradient-brand-purple)' }}
                          >
                            {totalPendentes}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!aberto && secundario.conteudo === chave && secundario.slot &&
        createPortal(
          <ConteudoSecundario titulo={tituloGaveta ?? item.rotulo}>
            {secoes.map((sec, i) => [
              sec.titulo ? (
                <div key={`t-${sec.titulo}`} className={`painel-secundario-secao${i === 0 ? ' painel-secundario-secao-primeira' : ''}`}>
                  {sec.titulo}
                </div>
              ) : i > 0 ? (
                <div key={`d-${i}`} className="painel-secundario-divisor" />
              ) : null,
              ...sec.itens.map((f) => (
                <ItemSecundario
                  key={f.para}
                  para={f.para}
                  fim={f.fim}
                  icone={comIcones ? f.icone : undefined}
                  rotulo={f.rotulo}
                  selo={f.para.includes('validar-certificados') ? totalPendentes : 0}
                  aoClicar={() => aoClicarItem?.(f)}
                />
              )),
            ])}
          </ConteudoSecundario>,
          secundario.slot,
        )}
    </div>
  )
}

/**
 * Menu "Painéis" com estrutura dinâmica por perfil (spec §3):
 *
 * PARCEIRO:
 * Painéis ˅
 * ├── Mobiltec (Geral público)
 * └── [Nome da Empresa] (Exclusivo do parceiro logado)
 *
 * ADMIN @MOBILTEC:
 * Painéis ˅
 * ├── Mobiltec (Geral público)
 * └── Parceiros ˅
 *     ├── Empresa A
 *     ├── Empresa B
 *     └── Empresa C
 */
function MenuPaineis({
  aberto,
  ehAdmin,
  ehParceiro,
  usuario,
  revisoesPendentes = 0,
}: {
  aberto: boolean
  ehAdmin: boolean
  ehParceiro: boolean
  usuario: any
  revisoesPendentes?: number
}) {
  const { pathname } = useLocation()
  const { data: parceiros = [] } = useParceiros(ehAdmin)
  const parceirosAtivos = parceiros.filter((p) => p.ativo)

  // Deduplica parceiros por empresa para que múltiplos usuários da mesma empresa formem um único ambiente
  const empresasParceirasUnicas = useMemo(() => {
    const mapa = new Map<string, typeof parceiros[number]>()
    for (const p of parceirosAtivos) {
      if (!p.empresa || !p.empresa.trim()) continue
      let chave = p.empresa.trim().toLowerCase()
      if (chave === 'tnsi' || chave === 'tns') {
        chave = 'tns'
      }
      // Mobiltec é a empresa principal/interna exibida no topo do menu Painel, não deve aparecer na lista de parceiros
      if (chave === 'mobiltec') continue

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          ...p,
          empresa: chave === 'tns' ? 'TNS' : p.empresa.trim(),
        })
      }
    }
    return Array.from(mapa.values())
  }, [parceirosAtivos])

  const noPainel =
    pathname === '/' ||
    pathname === '/paineis/mobiltec' ||
    pathname === '/paineis/meu-painel' ||
    pathname.startsWith('/paineis/parceiro')

  const noSubParceiros = pathname.startsWith('/paineis/parceiro')

  const [expandido, setExpandido] = useState(noPainel)
  const [parceirosExpandido, setParceirosExpandido] = useState(noSubParceiros)
  const [emHover, setEmHover] = useState(false)
  const refTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const secundario = useContext(SecundarioCtx)
  const saidaNav = useContext(SaidaNavCtx)
  const chave = 'Painel'
  const secundarioAberto = !aberto && secundario.ativo === chave

  useEffect(() => {
    if (noPainel) setExpandido(true)
    if (noSubParceiros) setParceirosExpandido(true)
  }, [noPainel, noSubParceiros])

  useEffect(() => {
    if (!aberto) {
      setExpandido(false)
      setEmHover(false)
    }
  }, [aberto])

  useEffect(() => {
    return () => {
      if (refTimeout.current) clearTimeout(refTimeout.current)
    }
  }, [])

  function aoEntrarMouse() {
    if (!aberto) {
      secundario.abrir(chave)
      return
    }
    // Intenção: só abre se o mouse parar no grupo. Passar por cima a caminho
    // de outro item não dispara nada.
    if (refTimeout.current) clearTimeout(refTimeout.current)
    refTimeout.current = setTimeout(() => setEmHover(true), ATRASO_ABRIR_HOVER)
  }

  function aoSairMouse() {
    if (!aberto) {
      secundario.agendarFechar()
      return
    }
    // Não fecha ao sair do grupo: recolher aqui puxaria os itens de baixo para
    // cima, sob o cursor, e abriria outro grupo sem querer. Quem recolhe é a
    // saída do mouse do menu inteiro (`saidaNav`).
    if (refTimeout.current) {
      clearTimeout(refTimeout.current)
      refTimeout.current = null
    }
  }

  // O mouse deixou o menu: recolhe o que foi aberto só pelo hover
  useEffect(() => {
    if (saidaNav > 0) setEmHover(false)
  }, [saidaNav])

  function alternar() {
    if (aberto) {
      setExpandido((v) => {
        const proximo = !v
        if (!proximo) setEmHover(false)
        return proximo
      })
      return
    }
    // Hover já abre; o clique garante a abertura no toque
    secundario.abrir(chave)
  }

  const abertoVisivel = expandido || emHover

  return (
    <div
      className="relative"
      onMouseEnter={aoEntrarMouse}
      onMouseLeave={aoSairMouse}
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto ? abertoVisivel : secundarioAberto}
        title={aberto ? undefined : 'Painel'}
        data-grupo-menu="Painel"
        className={`btn-menu-lateral relative flex items-center select-none outline-none focus:outline-none focus-visible:outline-none ${
          aberto
            ? 'w-full gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium leading-tight'
            : 'mx-auto h-9 w-9 items-center justify-center rounded-lg'
        } ${
          noPainel
            ? 'btn-menu-ativo text-white'
            : 'text-[var(--color-muted-foreground)]'
        } ${secundarioAberto ? 'btn-menu-secundario' : ''}`}
        style={{
          background: noPainel ? 'var(--gradient-brand-purple)' : undefined,
          boxShadow: noPainel ? '0 2px 6px -1px rgba(126, 32, 101, 0.35)' : undefined,
          justifyContent: aberto ? 'flex-start' : 'center',
        }}
      >
        <Icone nome="dashboard" className="h-[18px] w-[18px] shrink-0" />
        {!aberto && ehParceiro && revisoesPendentes > 0 && (
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full ring-2 shadow-xs"
            style={{ background: '#F59E0B' }}
          />
        )}
        {aberto && (
          <>
            <span className="flex-1 truncate text-left">Painel</span>
            {ehParceiro && revisoesPendentes > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                style={{ background: '#F59E0B' }}
              >
                {revisoesPendentes}
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-75"
              style={{ transform: abertoVisivel ? 'rotate(180deg)' : 'none' }}
              aria-hidden
            >
              <path
                d="M4 6.5 8 10.5l4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {aberto && (
        <div
          className="menu-accordion-wrapper"
          data-aberto={abertoVisivel ? 'true' : 'false'}
        >
          <div className="menu-accordion-content">
            <div
              className="mt-1 ml-5 space-y-0.5"
            >
              {/* Mobiltec — Painel Geral Público */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `btn-menu-subitem flex items-center justify-between truncate rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-tight outline-none focus:outline-none focus-visible:outline-none ${
                    isActive
                      ? 'btn-subitem-ativo bg-[var(--color-muted)] text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-muted-foreground)]'
                  }`
                }
              >
                <span className="truncate">Mobiltec</span>
              </NavLink>

              {/* Se for PARCEIRO: mostra diretamente o nome da própria empresa (se não for a Mobiltec) */}
              {ehParceiro && usuario?.empresa && usuario.empresa.trim().toLowerCase() !== 'mobiltec' && (
                <NavLink
                  to="/paineis/meu-painel"
                  className={({ isActive }) =>
                    `btn-menu-subitem flex items-center justify-between truncate rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-tight outline-none focus:outline-none focus-visible:outline-none ${
                      isActive
                        ? 'btn-subitem-ativo bg-[var(--color-muted)] text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-muted-foreground)]'
                    }`
                  }
                >
                  <span className="truncate">{usuario.empresa}</span>
                  {revisoesPendentes > 0 && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ background: '#F59E0B' }}
                    >
                      {revisoesPendentes}
                    </span>
                  )}
                </NavLink>
              )}

              {/* Se for ADMIN: mostra submenu Parceiros ˅ com a lista de todos os parceiros */}
              {ehAdmin && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setParceirosExpandido((v) => !v)}
                    className={`btn-menu-subitem flex items-center justify-between w-full truncate rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-tight cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                      noSubParceiros
                        ? 'text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                    }`}
                  >
                    <span className="truncate">Parceiros</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3 shrink-0 transition-transform duration-200 opacity-70"
                        style={{ transform: parceirosExpandido ? 'rotate(180deg)' : 'none' }}
                        aria-hidden
                      >
                        <path
                          d="M4 6.5 8 10.5l4-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>

                  {parceirosExpandido && (
                    <div
                      className="mt-0.5 ml-2.5 space-y-0.5"
                    >
                      {empresasParceirasUnicas.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic px-2 py-1 block">
                          Nenhum parceiro cadastrado
                        </span>
                      ) : (
                        empresasParceirasUnicas.map((p) => (
                          <NavLink
                            key={p.empresa}
                            to={`/paineis/parceiro/${p.id}`}
                            className={({ isActive }) =>
                              `btn-menu-subitem flex items-center justify-between truncate rounded-md px-2 py-1 text-[12px] font-medium leading-tight outline-none focus:outline-none focus-visible:outline-none ${
                                isActive
                                  ? 'bg-[var(--color-muted)] text-[var(--color-primary)] font-semibold'
                                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                              }`
                            }
                            title={p.empresa}
                          >
                            <span className="truncate">{p.empresa}</span>
                          </NavLink>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coluna secundária (menu recolhido) */}
      {!aberto && secundario.conteudo === chave && secundario.slot &&
        createPortal(
          <ConteudoSecundario titulo="Painel de homologação">
            <ItemSecundario para="/" fim rotulo="Mobiltec" />
            {ehParceiro && usuario?.empresa && usuario.empresa.trim().toLowerCase() !== 'mobiltec' && (
              <ItemSecundario
                para="/paineis/meu-painel"
               
                rotulo={usuario.empresa}
                selo={revisoesPendentes}
                corSelo="#F59E0B"
              />
            )}
            {ehAdmin && (
              <>
                <div className="painel-secundario-secao">Parceiros</div>
                {empresasParceirasUnicas.length === 0 ? (
                  <span className="painel-secundario-vazio">Nenhum parceiro cadastrado</span>
                ) : (
                  empresasParceirasUnicas.map((p) => (
                    <ItemSecundario
                      key={p.empresa}
                      para={`/paineis/parceiro/${p.id}`}
                     
                      rotulo={p.empresa}
                    />
                  ))
                )}
              </>
            )}
          </ConteudoSecundario>,
          secundario.slot,
        )}
    </div>
  )
}

/**
 * Nome do registro, ao centro da barra.
 *
 * Só nas telas de planilha: é o rótulo do documento que a bateria de testes
 * produz. No painel não faz sentido — ali não se registra nada, só se lê o
 * que já foi homologado.
 */
const NOME_REGISTRO = 'Registro de Testes Internos'

/**
 * Casca do sistema: menu retrátil à esquerda, conteúdo à direita.
 *
 * O menu é montado a partir das categorias ativas — cadastrar uma nova
 * categoria no banco a faz aparecer aqui sozinha, sem mexer no código.
 */
const CHAVE_VALIDACAO_VISTOS = 'homolog.validacao-certificados-vistos'

function obterVistosArmazenados(): string[] {
  try {
    const raw = localStorage.getItem(CHAVE_VALIDACAO_VISTOS)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch {
    /* fallback */
  }
  return []
}

function salvarVistosArmazenados(ids: string[]) {
  try {
    localStorage.setItem(CHAVE_VALIDACAO_VISTOS, JSON.stringify(ids))
  } catch {
    /* fallback */
  }
}

export function Layout() {
  const { usuario, ehParceiro, ehAdmin, sair } = useAuth()
  const { data: categorias } = useCategorias()
  const { data: todasHomologacoes = [] } = useListaHomologacoes()
  const { data: todosParceiros = [] } = useParceiros(ehAdmin)
  const { data: notificacoesData } = useNotificacoes()
  const { pathname } = useLocation()

  const revisoesPendentes = ehParceiro ? (notificacoesData?.naoLidas ?? 0) : 0

  const [vistosValidacao, setVistosValidacao] = useState<string[]>(obterVistosArmazenados)

  // O selo do menu conta o que espera ação da Mobiltec, e só isso (D436).
  // `EM_REVISAO` está com o parceiro: contá-lo aqui mantinha o número aceso
  // sobre uma fila de validação vazia.
  const homologacoesPendentes = useMemo(() => {
    return todasHomologacoes.filter((h) => h.status === 'AGUARDANDO_ANALISE')
  }, [todasHomologacoes])

  // Limpa IDs de homologações que já não estão mais pendentes de análise
  useEffect(() => {
    if (!ehAdmin || homologacoesPendentes.length === 0) return
    const idsAtuais = new Set(homologacoesPendentes.map((h) => h.id))
    setVistosValidacao((prev) => {
      const filtrados = prev.filter((id) => idsAtuais.has(id))
      if (filtrados.length !== prev.length) {
        salvarVistosArmazenados(filtrados)
        return filtrados
      }
      return prev
    })
  }, [ehAdmin, homologacoesPendentes])

  // Homologações pendentes não visualizadas pelo admin
  const pendenciasNaoVistas = useMemo(() => {
    if (!ehAdmin) return []
    const vistosSet = new Set(vistosValidacao)
    return homologacoesPendentes.filter((h) => !vistosSet.has(h.id))
  }, [ehAdmin, homologacoesPendentes, vistosValidacao])

  const totalPendentes = ehAdmin ? pendenciasNaoVistas.length : 0

  function marcarPendenciasComoVistas() {
    if (!ehAdmin || homologacoesPendentes.length === 0) return
    const todosIds = homologacoesPendentes.map((h) => h.id)
    setVistosValidacao(todosIds)
    salvarVistosArmazenados(todosIds)
  }

  // Se o usuário está na tela de validar certificados, descarta os avisos pendentes
  useEffect(() => {
    if (ehAdmin && pathname.includes('validar-certificados') && pendenciasNaoVistas.length > 0) {
      marcarPendenciasComoVistas()
    }
  }, [ehAdmin, pathname, pendenciasNaoVistas.length])

  const [aberto, setAberto] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_MENU) !== 'false'
    } catch {
      return true
    }
  })

  // Coluna secundária do menu recolhido. `conteudo` segura o último grupo até
  // o fim da animação de fechar, para a coluna não esvaziar enquanto encolhe.
  const [secundarioAtivo, setSecundarioAtivo] = useState<string | null>(null)
  const [secundarioConteudo, setSecundarioConteudo] = useState<string | null>(null)
  const [slotSecundario, setSlotSecundario] = useState<HTMLElement | null>(null)
  const secundarioVisivel = !aberto && secundarioAtivo !== null

  const refFecharSecundario = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saidaNav, setSaidaNav] = useState(0)

  const ctxSecundario = useMemo<ContextoSecundario>(() => {
    const cancelarFechar = () => {
      if (refFecharSecundario.current) {
        clearTimeout(refFecharSecundario.current)
        refFecharSecundario.current = null
      }
    }
    return {
      ativo: secundarioAtivo,
      conteudo: secundarioConteudo,
      slot: slotSecundario,
      abrir: (chave) => {
        cancelarFechar()
        setSecundarioAtivo(chave)
        setSecundarioConteudo(chave)
      },
      fechar: () => {
        cancelarFechar()
        setSecundarioAtivo(null)
      },
      agendarFechar: () => {
        cancelarFechar()
        refFecharSecundario.current = setTimeout(() => setSecundarioAtivo(null), 180)
      },
      cancelarFechar,
    }
  }, [secundarioAtivo, secundarioConteudo, slotSecundario])

  useEffect(() => () => {
    if (refFecharSecundario.current) clearTimeout(refFecharSecundario.current)
  }, [])

  useEffect(() => {
    if (!secundarioAtivo) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSecundarioAtivo(null)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [secundarioAtivo])

  function alternar() {
    setSecundarioAtivo(null)
    setAberto((v) => {
      try {
        localStorage.setItem(CHAVE_MENU, String(!v))
      } catch {
        /* navegador sem storage: o menu só não lembra o estado */
      }
      return !v
    })
  }

  const categoriasFiltradas = (categorias ?? []).filter((c) => {
    if (!ehParceiro) return true
    return usuario?.categoriasPermitidas?.includes(c.slug)
  })

  const itensCategorias: ItemMenuDados[] = categoriasFiltradas.map((c) => ({
    para: `/matriz/${c.slug}`,
    rotulo: c.nome,
    icone: iconeDaCategoria(c.icone),
    fim: false,
  }))

  const homologacoes = { para: '/matriz', rotulo: 'Homologações', icone: 'homologacao' as NomeIcone }

  /**
   * Ambiente: tudo o que configura o sistema, num grupo só, abaixo do traço.
   * Hoje é área da Mobiltec — o HOMOLOGADOR vê só a bateria de testes; o
   * ADMIN vê também dispositivos e parceiros.
   */
  const ambiente = { para: '/registro', rotulo: 'Ambiente', icone: 'engrenagem' as NomeIcone }
  const opcoesHomologacaoConfig: ItemMenuDados[] = [
    { para: '/registro', rotulo: 'Registrar homologação', icone: 'registro', fim: true },
    // `fim: false`: editar um tipo é `/registro/tipos/:id`, e a opção continua
    // sendo esta. O item acima é `fim: true` para não engolir esta rota.
    { para: '/registro/tipos', rotulo: 'Editar homologação', icone: 'registro', fim: false },
  ]
  const opcoesDispositivos: ItemMenuDados[] = [
    { para: '/configurar-dispositivos', rotulo: 'Configurar dispositivos', icone: 'smartphone', fim: false },
  ]
  const opcoesParceiros: ItemMenuDados[] = [
    { para: '/ambiente/parceiros', rotulo: 'Registrar parceiro', icone: 'parceiros', fim: true },
    { para: '/parceiros/validar-certificados', rotulo: 'Validar certificado', icone: 'certificado', fim: true },
  ]
  const secoesAmbiente: SecaoMenu[] = [
    { titulo: 'Bateria de testes', itens: opcoesHomologacaoConfig },
    ...(ehAdmin
      ? [
          { itens: opcoesDispositivos },
          { titulo: 'Parceiros', itens: opcoesParceiros },
        ]
      : []),
  ]

  // 224px: o item mais largo é "Painel de Homologação" (~150px) mais ícone e
  // recuo. Em 280 sobrava uma faixa vazia à direita de todos os itens.
  const largura = aberto ? 224 : 64

  /**
   * Seção atual, para a trilha da barra superior.
   *
   * Em menus que possuem mais de uma opção (como Configurar Homologação e Parceiros),
   * a barra do topo mantém sempre o nome do grupo principal, enquanto a página
   * exibe no título principal o nome da tela/submenu.
   */
  const secao = (() => {
    if (pathname === '/' || pathname === '/paineis/mobiltec') {
      return { rotulo: 'Painel · Mobiltec', icone: 'dashboard' as NomeIcone }
    }
    if (pathname === '/paineis/meu-painel') {
      return { rotulo: `Painel · ${usuario?.empresa || 'Meu Painel'}`, icone: 'dashboard' as NomeIcone }
    }
    if (pathname.startsWith('/paineis/parceiro/')) {
      const idOuEmpresa = pathname.replace('/paineis/parceiro/', '')
      const p = todosParceiros.find((x) => x.id === idOuEmpresa || x.empresa.toLowerCase() === idOuEmpresa.toLowerCase())
      return { rotulo: `Painel · ${p?.empresa || idOuEmpresa}`, icone: 'dashboard' as NomeIcone }
    }
    if (pathname.startsWith('/configurar-dispositivos') || pathname.startsWith('/dispositivos/gerenciar')) {
      return { rotulo: 'Ambiente · Dispositivos', icone: 'engrenagem' as NomeIcone }
    }
    if (opcoesHomologacaoConfig.some((i) => (i.fim ? pathname === i.para : pathname.startsWith(i.para)))) {
      return { rotulo: 'Ambiente · Bateria de testes', icone: 'engrenagem' as NomeIcone }
    }
    if (opcoesParceiros.some((i) => (i.fim ? pathname === i.para : pathname.startsWith(i.para)))) {
      return { rotulo: 'Ambiente · Parceiros', icone: 'engrenagem' as NomeIcone }
    }
    const cat = itensCategorias.find((i) => (i.fim ? pathname === i.para : pathname.startsWith(i.para)))
    if (cat) {
      return { rotulo: `Homologações · ${cat.rotulo}`, icone: cat.icone }
    }
    return { rotulo: 'Painel · Mobiltec', icone: 'dashboard' as NomeIcone }
  })()

  /** Só as telas de planilha registram testes */
  const ehPlanilha = pathname.startsWith('/matriz')

  const ehSandbox =
    import.meta.env.VITE_AMBIENTE === 'sandbox' ||
    window.location.hostname.includes('sandbox')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {ehSandbox && (
        <div
          className="w-full py-1.5 px-4 text-center text-xs font-bold uppercase tracking-wider shrink-0 z-50 flex items-center justify-center gap-2 shadow-sm"
          style={{ background: '#FEF3C7', color: '#92400E', borderBottom: '1px solid #FCD34D' }}
        >
          <span>⚠️ AMBIENTE SANDBOX — EXPERIMENTAÇÃO ISOLADA (SEM IMPACTO EM PRODUÇÃO)</span>
        </div>
      )}

      {/* O fundo da janela é o mesmo do menu: é a faixa que aparece em volta do
          card do painel e o que dá a ele o efeito de folha solta. */}
      <SecundarioCtx.Provider value={ctxSecundario}>
      <div className="relative flex-1 flex min-h-0 overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
        <aside
          className="relative z-40 flex flex-col shrink-0 transition-[width] duration-200"
          style={{ width: largura, background: 'var(--color-sidebar)' }}
        >
          {/* Sem botão aqui dentro: aberto fica só o lockup, recolhido só o
              símbolo — ambos centralizados. Quem abre e fecha é o botão da
              borda, que não se confunde com a marca. */}
          <div
            className="flex items-center justify-center border-b px-3 shrink-0"
            style={{ height: 'var(--topbar-h)' }}
          >
            {aberto ? (
              <LogoMobiltec className="h-11 w-auto" />
            ) : (
              <LogoMobiltec variante="simbolo" className="h-7 w-7" />
            )}
          </div>

          <SaidaNavCtx.Provider value={saidaNav}>
          <nav
            className="flex-1 overflow-y-auto p-2 space-y-1"
            onMouseLeave={() => aberto && setSaidaNav((n) => n + 1)}
          >
            {/* Menu Painéis (diferenciado por perfil) */}
            <MenuPaineis
              aberto={aberto}
              ehAdmin={ehAdmin}
              ehParceiro={ehParceiro}
              usuario={usuario}
              revisoesPendentes={revisoesPendentes}
            />

            {/* Menu Homologações — os dispositivos registrados ficam aqui */}
            {itensCategorias.length > 0 && (
              <GrupoMenu
                item={homologacoes}
                filhos={itensCategorias}
                aberto={aberto}
                comIcones
              />
            )}

            {/* O traço marca a mudança de natureza: acima, os tipos que já
                existem; abaixo, quem cria e mantém a lista deles. */}
            {!ehParceiro && (
              <div className="!mt-2 pt-2 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <GrupoMenu
                  item={ambiente}
                  secoes={secoesAmbiente}
                  tituloGaveta="Configuração do ambiente"
                  aberto={aberto}
                  totalPendentes={totalPendentes}
                  aoClicarItem={(item) => {
                    if (item.para.includes('validar-certificados')) {
                      marcarPendenciasComoVistas()
                    }
                  }}
                />
              </div>
            )}
          </nav>
          </SaidaNavCtx.Provider>

          <div className="border-t p-2 shrink-0">
            {aberto && (
              <div className="px-2.5 py-1 mb-1">
                <p className="truncate text-xs font-semibold">{usuario?.nome}</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {usuario?.cargo}
                </p>
              </div>
            )}
            <button
              onClick={sair}
              title="Sair"
              className={`btn-menu-lateral flex items-center select-none outline-none focus:outline-none focus-visible:outline-none ${
                aberto
                  ? 'w-full gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium leading-tight'
                  : 'mx-auto h-9 w-9 items-center justify-center rounded-lg'
              } text-[var(--color-muted-foreground)] hover:text-red-600`}
              style={{
                justifyContent: aberto ? 'flex-start' : 'center',
              }}
            >
              <Icone nome="sair" className="h-[18px] w-[18px] shrink-0" />
              {aberto && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* O painel inteiro é um card: a folga de 8px em volta deixa aparecer a
            faixa de fundo, e é ela que separa o card do menu — daí o `aside` ter
            perdido a borda direita. */}
        <main className="flex-1 min-w-0 p-2">
          <div
            className="flex h-full flex-col overflow-hidden rounded-xl border"
            style={{ background: 'var(--color-card)' }}
            data-painel
          >
            {/* Barra do topo do card. À esquerda, onde se está; ao centro, o
                nome do sistema, igual em todas as telas — nenhuma página repete
                o próprio título abaixo. O centro é absoluto para ficar no meio
                da barra, e não no meio do que sobra depois da trilha. */}
            <div className="relative flex shrink-0 items-center gap-3 border-b px-3 py-2">
              <button
                type="button"
                onClick={alternar}
                aria-label={aberto ? 'Recolher menu' : 'Expandir menu'}
                title={aberto ? 'Recolher menu' : 'Expandir menu'}
                className="grid h-8 w-8 place-items-center rounded-lg transition-all duration-150 outline-none focus:outline-none focus-visible:outline-none hover:bg-black/[0.04] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <Icone nome="painel" className="h-[18px] w-[18px]" />
              </button>

              <div className="h-5 w-px" style={{ background: 'var(--color-border)' }} />

              <div className="flex min-w-0 items-center gap-2">
                <Icone nome={secao.icone} className="h-4 w-4 shrink-0" />
                <h1 className="truncate text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {secao.rotulo}
                </h1>
              </div>

              {ehPlanilha && (
                <span
                  data-registro
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-sm font-semibold"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {NOME_REGISTRO}
                </span>
              )}

              <div className="ml-auto flex items-center gap-3 text-xs">
                <CentralNotificacoes />
                <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {usuario?.nome}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: ehParceiro ? 'var(--color-warning-soft)' : 'var(--color-info-soft)',
                    color: ehParceiro ? 'var(--color-warning-fg)' : 'var(--color-info-fg)',
                  }}
                >
                  {ehParceiro ? (usuario?.empresa?.replace(/^Parceiro\s*\((.*?)\)$/i, '$1') || usuario?.empresa || 'Parceiro') : 'Mobiltec'}
                </span>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
                    {/* Gaveta do menu recolhido: desliza da borda esquerda do card,
                        logo abaixo da barra de título, por cima do conteúdo,
                        enquanto o mouse estiver no ícone ou nela. */}
              <div
                className="painel-secundario"
                data-aberto={secundarioVisivel ? 'true' : 'false'}
                aria-hidden={!secundarioVisivel}
                inert={!secundarioVisivel}
                onMouseEnter={ctxSecundario.cancelarFechar}
                onMouseLeave={ctxSecundario.agendarFechar}
                onTransitionEnd={(e) => {
                  if (e.target === e.currentTarget && e.propertyName === 'opacity' && !secundarioAtivo) {
                    setSecundarioConteudo(null)
                  }
                }}
              >
                <nav ref={setSlotSecundario} className="painel-secundario-conteudo" aria-label="Opções do menu" />
              </div>

              <Outlet />
            </div>
          </div>
        </main>
      </div>
      </SecundarioCtx.Provider>
    </div>
  )
}
