import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ancorarMenu } from '@/lib/ancorarMenu'
import { rotuloVersao } from '@/lib/tipos'
import type { ColunaMatriz } from '@/lib/tipos'
import { SeloVersao } from '@/componentes/homologacao/VersoesHomologacao'

/**
 * As versões de um modelo, no cabeçalho da coluna (D522).
 *
 * Antes era só "2ª homologação" com um tooltip: o histórico existia no banco,
 * mas não dava para chegar nele. Agora cada versão abre a própria ficha —
 * resultado item a item, certificado e o que mudou da anterior.
 */
export function VersoesColuna({ coluna }: { coluna: ColunaMatriz }) {
  const navegar = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null)
  const refBotao = useRef<HTMLButtonElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)

  const atual = coluna.homologacao
  const versoes = [
    { id: atual.id, versaoAgente: atual.versaoAgente, versaoSo: atual.versaoSo, status: atual.status, data: atual.dataInicio },
    ...coluna.homologacoesAnteriores.map((h) => ({ ...h, data: h.dataFim ?? h.dataInicio })),
  ]

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (refBotao.current?.contains(alvo) || refMenu.current?.contains(alvo)) return
      setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  useLayoutEffect(() => {
    if (!aberto || !refMenu.current || !refBotao.current) return
    const m = refMenu.current.getBoundingClientRect()
    setPosicao(ancorarMenu(refBotao.current.getBoundingClientRect(), { largura: m.width, altura: m.height }))
  }, [aberto])

  function abrir() {
    const r = refBotao.current?.getBoundingClientRect()
    if (r) setPosicao({ x: r.left, y: r.bottom + 4 })
    setAberto(true)
  }

  return (
    <>
      <button
        ref={refBotao}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-expanded={aberto}
        data-versoes
        className="mt-0.5 inline-flex items-center gap-1 rounded px-1 text-[10px] font-normal text-white/75 transition-colors hover:bg-white/15 hover:text-white"
        title="Ver as versões testadas deste modelo"
      >
        {coluna.emReteste && <span className="font-semibold text-white">Reteste ·</span>}
        {versoes.length}ª homologação
        <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {aberto && posicao && (
        <div
          ref={refMenu}
          role="menu"
          className="fixed z-50 w-72 rounded-lg border py-1.5 text-left shadow-lg"
          // Filho do `th` roxo: cor explícita, senão o texto herda o branco
          style={{ left: posicao.x, top: posicao.y, background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
            Versões de {atual.dispositivo.nomeComercial}
          </p>
          {versoes.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false)
                navegar(`/dispositivos/${v.id}`)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-brand-purple-soft)]"
            >
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="truncate font-semibold">
                  {rotuloVersao({ ...v, gerenciamento: atual.gerenciamento })}
                  {i === 0 && (
                    <span className="ml-1.5 font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                      (esta coluna)
                    </span>
                  )}
                </span>
                <span className="text-[10.5px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {new Date(v.data).toLocaleDateString('pt-BR')}
                </span>
              </span>
              <SeloVersao status={v.status} />
            </button>
          ))}
          <p className="mt-1 border-t px-3 pt-1.5 text-[10.5px]" style={{ color: 'var(--color-muted-foreground)' }}>
            Clique numa versão para abrir a ficha dela.
          </p>
        </div>
      )}
    </>
  )
}
