interface LoadingTelaProps {
  /** Texto explicativo exibido logo abaixo do loader */
  mensagem?: string
  /** 'sm' (48px), 'md' (64px) ou 'lg' (84px) */
  tamanho?: 'sm' | 'md' | 'lg'
  /** Ocupa a tela inteira como overlay fixo */
  telaCheia?: boolean
  className?: string
}

const DIMENSOES = {
  sm: { caixa: 'w-12 h-12', setas: 'w-5 h-5', stroke: 3, raio: 28, dash: '38 138' },
  md: { caixa: 'w-16 h-16', setas: 'w-7 h-7', stroke: 3.5, raio: 28, dash: '44 132' },
  lg: { caixa: 'w-20 h-20', setas: 'w-9 h-9', stroke: 4, raio: 28, dash: '52 124' },
} as const

/**
 * Indicador de carregamento oficial Mobiltec:
 * - As duas setinhas laranjas da logo centralizadas no meio
 * - Borda circular roxa em rotação contínua (estilo Google Play / Material)
 * - Texto de status da tela logo abaixo
 */
export function LoadingTela({
  mensagem = 'Carregando…',
  tamanho = 'md',
  telaCheia = false,
  className = '',
}: LoadingTelaProps) {
  const dim = DIMENSOES[tamanho]

  const conteudo = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Círculo do Loader */}
      <div className={`relative flex items-center justify-center ${dim.caixa}`}>
        {/* Borda roxa em rotação contínua */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Trilho de fundo suave */}
          <circle
            cx="32"
            cy="32"
            r={dim.raio}
            stroke="rgba(110, 34, 107, 0.12)"
            strokeWidth={dim.stroke}
          />
          {/* Arco roxo ativo girando */}
          <circle
            cx="32"
            cy="32"
            r={dim.raio}
            stroke="var(--color-brand-purple, #6e226b)"
            strokeWidth={dim.stroke}
            strokeDasharray={dim.dash}
            strokeLinecap="round"
          />
        </svg>

        {/* As 2 setinhas laranja da logo Mobiltec centralizadas */}
        <svg
          className={`${dim.setas} shrink-0`}
          viewBox="96 98 126 116"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="setasLaranjaGradiente" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f37804" />
              <stop offset="100%" stopColor="#ca3546" />
            </linearGradient>
          </defs>
          <path
            fill="url(#setasLaranjaGradiente)"
            d="M107.93,210.81c-2.25,0-4.52-.86-6.25-2.59-3.48-3.45-3.48-9.06,0-12.52l44.99-45-46-46c-3.45-3.45-3.45-9.07,0-12.52,3.45-3.46,9.07-3.46,12.52,0l52.25,52.26c3.46,3.45,3.46,9.07,0,12.52l-51.24,51.25c-1.73,1.72-4.01,2.59-6.28,2.59h.02Z"
          />
          <path
            fill="url(#setasLaranjaGradiente)"
            d="M216.02,156.84l-51.24,51.25c-1.73,1.72-4,2.59-6.27,2.59s-4.54-.86-6.25-2.59c-3.48-3.45-3.48-9.06,0-12.52l44.99-45-46-46c-3.46-3.45-3.46-9.07,0-12.52,3.45-3.46,9.04-3.46,12.52,0l52.25,52.27c3.48,3.45,3.48,9.07,0,12.52Z"
          />
        </svg>
      </div>

      {/* Texto referente ao carregamento da tela */}
      {mensagem && (
        <p
          className="text-sm font-medium tracking-tight text-center animate-pulse"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {mensagem}
        </p>
      )}
    </div>
  )

  if (telaCheia) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
        {conteudo}
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-[360px] w-full flex items-center justify-center p-8">
      {conteudo}
    </div>
  )
}
