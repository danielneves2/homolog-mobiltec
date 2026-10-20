import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ancorarMenu } from '@/lib/ancorarMenu'
import type { ItemTeste } from '@/lib/tipos'

/**
 * "?" roxo ao lado do nome do item na matriz (D502).
 *
 * Usado nos itens que agrupam várias funcionalidades — no iOS, cada linha de
 * "Configurações de Restrição" é um tópico (Restrições, Aplicativo, Rede…) que
 * cobre várias opções do perfil. O balão lista o que testar, marca o que só
 * existe em aparelho supervisionado e lembra a regra de marcação.
 *
 * Balão `position: fixed`, pelo mesmo motivo dos menus da matriz: a tabela
 * rola e recortaria um balão posicionado dentro dela.
 */
export function AjudaItem({ item }: { item: ItemTeste }) {
  const funcionalidades = item.funcionalidades ?? []
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

  if (funcionalidades.length === 0) return null

  const agrupa = funcionalidades.length > 1

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
        className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full align-middle text-[10px] font-bold text-white transition-transform hover:scale-110"
        style={{ background: 'var(--color-primary)' }}
      >
        ?
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
            {agrupa ? 'Teste as funcionalidades' : 'O que testar'}
          </p>
          <ul className="space-y-1">
            {funcionalidades.map((f) => (
              <li key={f.nome} className="flex items-start justify-between gap-2">
                <span>{f.nome}</span>
                {!f.byod && (
                  <span
                    className="shrink-0 rounded px-1.5 py-px text-[9.5px] font-semibold"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    title="Não existe em aparelho BYOD"
                  >
                    só supervisionado
                  </span>
                )}
              </li>
            ))}
          </ul>
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
