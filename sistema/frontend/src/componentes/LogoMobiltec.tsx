/**
 * Marca da Mobiltec.
 *
 * Dois arquivos, dois usos:
 * - `logo-mobiltec.svg` — o lockup completo (símbolo + MOBILTEC + assinatura).
 *   Usado onde há largura sobrando: menu aberto e tela de login.
 * - `marca-mobiltec.svg` — só o símbolo, 2 KB e vetorial de verdade. Usado
 *   onde o espaço é apertado (menu recolhido) e no favicon.
 *
 * Ambos são servidos de `public/`, nunca inlinados: o lockup tem raster
 * embutido e pesa ~515 KB, que no bundle viraria custo de carregamento.
 */
const ARQUIVO = {
  completa: '/logo-mobiltec.svg',
  simbolo: '/marca-mobiltec.svg',
} as const

export function LogoMobiltec({
  className,
  style,
  variante = 'completa',
}: {
  className?: string
  style?: React.CSSProperties
  /** `completa` = lockup com o nome; `simbolo` = só o ícone circular */
  variante?: keyof typeof ARQUIVO
}) {
  return (
    <img
      src={ARQUIVO[variante]}
      alt="Mobiltec"
      className={className}
      style={{ objectFit: 'contain', ...style }}
    />
  )
}
