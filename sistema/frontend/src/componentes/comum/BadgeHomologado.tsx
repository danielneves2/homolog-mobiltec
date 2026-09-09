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
  className = '',
}: {
  homologado?: boolean
  comIcone?: boolean
  className?: string
}) {
  if (!homologado) {
    return (
      <span
        className={`inline-flex items-center text-[11px] font-semibold tracking-tight whitespace-nowrap select-none shrink-0 ${className}`}
        style={{
          color: '#B91C1C',
        }}
      >
        Não homologado
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold tracking-tight whitespace-nowrap select-none shrink-0 ${className}`}
      style={{
        color: '#16805A',
      }}
    >
      Homologado
    </span>
  )
}
