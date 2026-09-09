import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ancorarMenu } from '@/lib/ancorarMenu'

export interface OpcaoFiltro {
  valor: string
  rotulo: string
}

/**
 * Dropdown da barra de filtros.
 *
 * Existe em vez de um `<select>` nativo por um motivo só: o nativo mostra o
 * texto da opção selecionada quando fechado, então "Todos os fabricantes"
 * ocuparia a barra inteira no estado padrão. Aqui o botão fechado mostra o
 * rótulo curto ("Fabricante") e a lista aberta mostra o texto completo.
 */
export function SeletorFiltro({
  rotuloCurto,
  rotuloTodos,
  valor,
  aoMudar,
  opcoes,
}: {
  /** Aparece no botão quando nada está selecionado */
  rotuloCurto: string
  /** Primeira opção da lista — o estado "sem filtro" */
  rotuloTodos: string
  valor: string
  aoMudar: (v: string) => void
  opcoes: OpcaoFiltro[]
}) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<{ x: number; y: number; largura: number } | null>(null)
  const refRaiz = useRef<HTMLDivElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)
  const refBotao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (refRaiz.current?.contains(alvo) || refMenu.current?.contains(alvo)) return
      setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    // O menu é `fixed`, então acompanha scroll/resize pela posição recalculada
    const fechar = () => setAberto(false)
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  // A lista pode passar da borda de baixo (filtro de fabricante tem dezenas
  // de opções). Medida a altura real, o menu vira para cima se precisar.
  useLayoutEffect(() => {
    if (!aberto || !refMenu.current || !refBotao.current || !posicao) return
    const m = refMenu.current.getBoundingClientRect()
    const p = ancorarMenu(refBotao.current.getBoundingClientRect(), {
      largura: posicao.largura,
      altura: m.height,
    })
    if (p.x !== posicao.x || p.y !== posicao.y) setPosicao({ ...posicao, ...p })
    // `posicao` fora das dependências de propósito: o efeito só precisa rodar
    // na abertura, e incluí-lo faria o próprio `setPosicao` re-disparar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function alternar() {
    if (aberto) {
      setAberto(false)
      return
    }
    // `fixed` + coordenadas da tela: o card do cabeçalho tem `overflow-hidden`
    // e recortaria um menu posicionado com `absolute`.
    const r = refBotao.current?.getBoundingClientRect()
    if (r) {
      // Largura explícita é obrigatória: sem ela, um elemento `fixed` ocupa
      // todo o espaço da esquerda até a borda da janela, e os itens `w-full`
      // esticam junto. O menu acompanha o botão, com um mínimo para caber
      // "Todos os fabricantes (12)".
      const largura = Math.max(r.width, 208)
      // Não deixa vazar pela direita da janela
      const x = Math.min(r.left, window.innerWidth - largura - 8)
      setPosicao({ x: Math.max(8, x), y: r.bottom + 4, largura })
    }
    setAberto(true)
  }

  const ativo = valor !== ''
  const selecionada = opcoes.find((o) => o.valor === valor)

  return (
    <div ref={refRaiz} className="relative">
      <button
        ref={refBotao}
        type="button"
        onClick={alternar}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        // Identidade estável: o texto do botão vira o valor escolhido, então
        // ele não serve para endereçar o filtro de fora
        data-filtro={rotuloCurto}
        title={ativo ? `${rotuloCurto}: ${selecionada?.rotulo}` : rotuloTodos}
        className={`relative px-2.5 py-1.5 text-sm flex items-center gap-1.5 max-w-48 transition-colors select-none cursor-pointer rounded-md outline-none focus:outline-none focus-visible:outline-none ${
          ativo
            ? 'font-semibold text-[var(--color-primary)]'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-black/[0.035]'
        }`}
      >
        <span className="truncate">{ativo ? selecionada?.rotulo : rotuloCurto}</span>
        <span className={`text-[10px] shrink-0 opacity-60 transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`}>▾</span>
        {ativo && (
          <span
            className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
        )}
      </button>

      {aberto && posicao && (
        <div
          ref={refMenu}
          role="listbox"
          className="fixed z-[100] max-h-80 overflow-y-auto rounded-lg border shadow-lg py-1"
          style={{
            left: posicao.x,
            top: posicao.y,
            width: posicao.largura,
            background: 'var(--color-popover)',
          }}
        >
          {[{ valor: '', rotulo: rotuloTodos }, ...opcoes].map((o) => {
            const marcada = o.valor === valor
            return (
              <button
                key={o.valor || '__todos'}
                type="button"
                role="option"
                aria-selected={marcada}
                onClick={() => {
                  aoMudar(o.valor)
                  setAberto(false)
                }}
                className="w-full px-3 py-1.5 text-left text-sm truncate transition-colors hover:opacity-80"
                style={{
                  background: marcada ? 'var(--color-muted)' : 'transparent',
                  fontWeight: marcada ? 600 : 400,
                  color: marcada ? 'var(--color-primary)' : 'inherit',
                }}
              >
                {o.rotulo}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
