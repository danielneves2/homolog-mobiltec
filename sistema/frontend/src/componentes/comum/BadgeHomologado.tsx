/**
 * Badge de status "Homologado"
 *
 * Estilo minimalista, sofisticado, tecnológico e corporativo para SaaS premium:
 * - Formato pill com cantos totalmente arredondados (rounded-full)
 * - Fundo verde extremamente claro e discreto (#E8F5EE)
 * - Texto em verde esmeralda sofisticado (#16805A)
 * - Tipografia sem serifa com peso semibold
 * - Ícone de confirmação sutil em verde esmeralda
 * - Sem gradientes, sem sombras fortes, contraste suave e equilibrado
 */
export function BadgeHomologado({
  homologado = true,
  comIcone = true,
  className = '',
}: {
  homologado?: boolean
  comIcone?: boolean
  className?: string
}) {
  if (!homologado) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-tight whitespace-nowrap select-none shrink-0 ${className}`}
        style={{
          background: '#FEECEB',
          color: '#B91C1C',
        }}
      >
        {comIcone && (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 shrink-0"
            fill="none"
            stroke="#B91C1C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        )}
        Não homologado
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap select-none shrink-0 ${className}`}
      style={{
        background: 'rgba(126, 32, 101, 0.08)',
        color: 'var(--color-primary)',
      }}
    >
      {comIcone && (
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 shrink-0"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="2.5 6.2 4.6 8.5 9.5 3.5" />
        </svg>
      )}
      Homologado
    </span>
  )
}
