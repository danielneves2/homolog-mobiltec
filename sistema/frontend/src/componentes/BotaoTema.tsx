import { useTema } from '@/lib/tema'

/**
 * Alterna claro/escuro, ao lado do sino (D523). Mostra o tema para o qual o
 * clique leva: lua no claro, sol no escuro.
 */
export function BotaoTema() {
  const { tema, alternar } = useTema()
  const escuro = tema === 'escuro'

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
      aria-pressed={escuro}
      data-botao-tema
      className="grid h-8 w-8 place-items-center rounded-lg transition-colors duration-150 hover:bg-[var(--color-hover)]"
      style={{ color: 'var(--color-muted-foreground)' }}
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  )
}
