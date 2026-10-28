import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ancorarMenu } from '@/lib/ancorarMenu'
import type { ItemTeste } from '@/lib/tipos'

/**
 * "i" roxo (informação) ao lado do nome do item na matriz (D502).
 *
 * Usado nos itens que agrupam várias funcionalidades — no iOS, cada linha de
 * "Configurações de Restrição" é um tópico (Restrições, Aplicativo, Rede…) que
 * cobre várias opções do perfil. O balão lista o que testar, marca o que só
 * existe em aparelho supervisionado e lembra a regra de marcação.
 *
 * Balão `position: fixed`, pelo mesmo motivo dos menus da matriz: a tabela
 * rola e recortaria um balão posicionado dentro dela.
 */
export function AjudaItem({
  item,
  temByod = false,
  temSupervisionado = true,
}: {
  item: ItemTeste
  /** Há coluna BYOD na matriz: mostra quais funcionalidades valem para ela */
  temByod?: boolean
  /** Há coluna supervisionada (ou Android): a lista completa vale */
  temSupervisionado?: boolean
}) {
  const todas = item.funcionalidades ?? []
  const doByod = todas.filter((f) => f.byod)
  // Só colunas BYOD na tela: a lista já é a do BYOD. Caso contrário, a lista
  // completa, sem marcação, e — se houver coluna BYOD e só parte valer para
  // ela — uma seção à parte com as que funcionam em BYOD.
  const funcionalidades = temSupervisionado ? todas : doByod
  const secaoByod = temByod && temSupervisionado && doByod.length > 0 && doByod.length < todas.length
  const byodSemNada = temByod && !temSupervisionado && doByod.length === 0
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null)
  const refGatilho = useRef<HTMLButtonElement>(null)
  const refBalao = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!aberto || !refBalao.current || !refGatilho.current) return
    const b = refBalao.current.getBoundingClientRect()
    setPosicao(
      ancorarMenu(refGatilho.current.getBoundingClientRect(), { largura: b.width, altura: b.height }, 8, 'inicio'),
    )
  }, [aberto])

  if (todas.length === 0) return null

  const agrupa = todas.length > 1

  function abrir() {
    const r = refGatilho.current?.getBoundingClientRect()
    if (r) setPosicao({ x: r.left, y: r.bottom + 6 })
    setAberto(true)
  }

  return (
    <>
      <button
        ref={refGatilho}
        type="button"
        aria-label={`O que testar em ${item.nome}`}
        aria-expanded={aberto}
        onMouseEnter={abrir}
        onMouseLeave={() => setAberto(false)}
        onFocus={abrir}
        onBlur={() => setAberto(false)}
        className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full align-middle text-white transition-transform hover:scale-110"
        style={{ background: 'var(--color-primary)' }}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden focusable="false">
          <circle cx="8" cy="4.9" r="1.1" fill="currentColor" />
          <rect x="7.1" y="7" width="1.8" height="5" rx="0.9" fill="currentColor" />
        </svg>
      </button>

      {/* Portal: a coluna dos nomes é sticky e criaria um contexto de
          empilhamento que esconde o balão atrás das células vizinhas */}
      {aberto && posicao && createPortal(
        <div
          ref={refBalao}
          role="tooltip"
          className="fixed z-50 w-80 rounded-lg border p-3.5 text-left text-xs font-normal leading-relaxed shadow-lg"
          style={{
            left: posicao.x,
            top: posicao.y,
            background: 'var(--color-popover)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        >
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            {agrupa ? (temSupervisionado ? 'Teste as funcionalidades' : 'Teste as funcionalidades (BYOD)') : 'O que testar'}
          </p>
          <ul className="space-y-1">
            {funcionalidades.map((f) => (
              <li key={f.nome}>{f.nome}</li>
            ))}
            {byodSemNada && <li style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma funcionalidade deste tópico existe em BYOD.</li>}
          </ul>
          {secaoByod && (
            <div className="mt-2.5 rounded-md px-2.5 py-2" style={{ background: 'var(--color-muted)' }}>
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                Funcionalidades para BYOD
              </p>
              <ul className="space-y-0.5">
                {doByod.map((f) => (
                  <li key={f.nome}>{f.nome}</li>
                ))}
              </ul>
            </div>
          )}
          {agrupa && (
            <p className="mt-2.5 border-t pt-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
              Divergência em <strong>todas</strong>: marque <strong>Falha</strong>. Em <strong>uma ou algumas</strong>:
              marque <strong>Com ressalva</strong> e descreva na observação.
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
