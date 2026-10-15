/**
 * Chave "Liberar para parceiros" de um tipo de dispositivo (D498).
 * Ligada: todos os parceiros veem a matriz. Desligada: homologação interna,
 * só a Mobiltec vê — inclusive some do Painel Mobiltec para os parceiros.
 */
export function ChaveLiberarParceiros({
  ligada,
  aoMudar,
  desabilitada = false,
}: {
  ligada: boolean
  aoMudar: (v: boolean) => void
  desabilitada?: boolean
}) {
  return (
    <label
      className="relative inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold"
      style={{ color: ligada ? 'var(--color-primary)' : 'var(--color-muted-foreground)', opacity: desabilitada ? 0.6 : 1 }}
      title={
        ligada
          ? 'Todos os parceiros veem esta matriz. Desligue para deixar como homologação interna.'
          : 'Homologação interna: só a Mobiltec vê. Ligue para liberar a todos os parceiros.'
      }
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={ligada}
        disabled={desabilitada}
        onChange={(e) => aoMudar(e.target.checked)}
        aria-label="Liberar para parceiros"
      />
      <span
        aria-hidden
        className="relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2"
        style={{ background: ligada ? 'var(--color-primary)' : 'var(--color-input)' }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full transition-all"
          style={{ left: ligada ? '14px' : '2px', background: 'var(--color-background)' }}
        />
      </span>
      {ligada ? 'Liberado para parceiros' : 'Homologação interna'}
    </label>
  )
}
