import { useState } from 'react'

/**
 * Nota interna sobre um resultado.
 *
 * Herdou o papel que era do checklist (removido): sem isso as 180 observações
 * já existentes no banco viravam somente-leitura. Não sai no certificado —
 * é registro interno, diferente da justificativa.
 */
export function ModalObservacao({
  itemNome,
  modeloNome,
  textoAtual,
  salvando,
  aoSalvar,
  aoFechar,
}: {
  itemNome: string
  modeloNome: string
  textoAtual: string
  salvando: boolean
  aoSalvar: (texto: string) => void
  aoFechar: () => void
}) {
  const [texto, setTexto] = useState(textoAtual)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.45)' }}
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') aoFechar()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) aoSalvar(texto)
        }}
        className="w-full max-w-xl rounded-xl border shadow-xl"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Observação</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
            {itemNome} · {modeloNome}
          </p>
        </div>

        <div className="p-5">
          <textarea
            autoFocus
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nota interna sobre este item. Aparece no caderno da homologação e não sai no certificado."
            className="w-full p-3 rounded-md border bg-transparent text-sm leading-relaxed resize-y"
            style={{ borderColor: 'var(--color-input)' }}
          />
        </div>

        <div className="p-5 border-t flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <kbd className="font-mono">Esc</kbd> cancela ·{' '}
            <kbd className="font-mono">Ctrl+Enter</kbd> salva
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="px-4 py-2 rounded-md text-sm"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => aoSalvar(texto)}
              disabled={salvando}
              className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
