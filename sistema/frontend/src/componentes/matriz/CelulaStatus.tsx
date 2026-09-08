import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { META_STATUS, STATUS_ORDEM } from '@/lib/tipos'
import { ancorarMenu } from '@/lib/ancorarMenu'
import type { ResultadoMatriz, StatusResultado } from '@/lib/tipos'

interface Props {
  resultado: ResultadoMatriz | undefined
  somenteLeitura: boolean
  aoEscolher: (status: StatusResultado) => void
  aoAbrirObservacao: () => void
  aoAbrirJustificativa: () => void
}

/**
 * Célula da matriz. Uma clicada abre o seletor com os 6 status.
 *
 * A planilha original usava Sim/Não com cores; aqui a cor faz o mesmo trabalho,
 * mas cada status tem identidade própria — a spec §5 proíbe o "Não" genérico
 * porque ele misturava bug do agente, limitação da plataforma e recurso
 * inexistente no hardware.
 */
export function CelulaStatus({
  resultado,
  somenteLeitura,
  aoEscolher,
  aoAbrirObservacao,
  aoAbrirJustificativa,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null)
  const refBotao = useRef<HTMLButtonElement>(null)
  const refMenu = useRef<HTMLDivElement>(null)

  const status = resultado?.status ?? 'NAO_TESTADO'
  const meta = META_STATUS[status]
  const justificativa = resultado?.justificativa?.titulo ?? resultado?.justificativaTexto

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node
      // O menu é irmão do botão, não filho dele — sem checar `refMenu` aqui, o
      // mousedown sobre uma opção desmontaria o menu antes do click chegar.
      if (refBotao.current?.contains(alvo) || refMenu.current?.contains(alvo)) return
      setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  // Só depois que o menu existe dá para saber a altura dele — e é a altura
  // que decide se ele abre para baixo ou vira para cima. `useLayoutEffect`
  // corrige antes da pintura, então não pisca na posição errada.
  useLayoutEffect(() => {
    if (!aberto || !refMenu.current || !refBotao.current) return
    const m = refMenu.current.getBoundingClientRect()
    setPosicao(
      ancorarMenu(refBotao.current.getBoundingClientRect(), {
        largura: m.width,
        altura: m.height,
      }),
    )
  }, [aberto])

  function abrir() {
    if (somenteLeitura) return
    const r = refBotao.current?.getBoundingClientRect()
    if (r) setPosicao({ x: r.left, y: r.bottom + 4 })
    setAberto(true)
  }

  const titulo = [
    meta.rotulo,
    justificativa ? `— ${justificativa}` : null,
    resultado?.observacao ? `\nObs: ${resultado.observacao}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <button
        ref={refBotao}
        type="button"
        onClick={abrir}
        disabled={somenteLeitura}
        title={titulo}
        data-status={status}
        className="group w-full h-full px-2 py-2 text-xs font-semibold text-center transition-all disabled:cursor-default hover:brightness-95"
        style={{ background: meta.corFill, color: meta.cor }}
      >
        {/* Todo status aparece escrito, "Não testado" inclusive: o traço que
            ficava aqui não dizia se a célula estava pendente ou se o item
            simplesmente não valia para aquele modelo. */}
        <span className="flex items-center justify-center gap-1.5">
          {meta.rotulo}
          {justificativa && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 opacity-70"
              style={{ background: 'currentColor' }}
              aria-label="tem justificativa"
            />
          )}
        </span>
      </button>

      {aberto && posicao && (
        <div
          ref={refMenu}
          role="menu"
          className="fixed z-50 rounded-lg border shadow-lg py-1 min-w-52"
          style={{ left: posicao.x, top: posicao.y, background: 'var(--color-popover)' }}
        >
          {STATUS_ORDEM.map((s) => {
            const m = META_STATUS[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setAberto(false)
                  aoEscolher(s)
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:opacity-80 transition-opacity"
                style={{ background: s === status ? 'var(--color-muted)' : 'transparent' }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.cor }} />
                <span className="flex-1">{m.rotulo}</span>
                <kbd
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {m.atalho}
                </kbd>
              </button>
            )
          })}

          <div className="my-1 border-t" />

          {/* A justificativa deixou de ser obrigatória para marcar o status,
              então precisa de porta própria: é por aqui que ela é escrita
              depois, quando o dev responde. */}
          <button
            type="button"
            onClick={() => {
              setAberto(false)
              aoAbrirJustificativa()
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:opacity-80 transition-opacity"
          >
            <span className="w-2.5 shrink-0 text-center">§</span>
            <span className="flex-1">Justificativa</span>
            {justificativa && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--color-primary)' }}
                aria-label="tem justificativa"
              />
            )}
          </button>

          {/* Observação: nota interna, herdada do checklist removido */}
          <button
            type="button"
            onClick={() => {
              setAberto(false)
              aoAbrirObservacao()
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:opacity-80 transition-opacity"
          >
            <span className="w-2.5 shrink-0 text-center">✎</span>
            <span className="flex-1">Observação</span>
            {resultado?.observacao && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--color-primary)' }}
                aria-label="tem observação"
              />
            )}
          </button>
        </div>
      )}
    </>
  )
}
