interface LoadingTelaProps {
  /** Texto explicativo exibido logo abaixo do loader */
  mensagem?: string
  /** 'sm' (32px), 'md' (44px) ou 'lg' (56px) */
  tamanho?: 'sm' | 'md' | 'lg'
  /** Ocupa a tela inteira como overlay fixo */
  telaCheia?: boolean
  className?: string
}

const CONFIG_TAMANHO = {
  sm: { caixa: 'w-8 h-8', setas: 'w-2.5 h-2.5', stroke: 2, raio: 22, dash: '28 110' },
  md: { caixa: 'w-11 h-11', setas: 'w-3.5 h-3.5', stroke: 2.2, raio: 23, dash: '34 111' },
  lg: { caixa: 'w-14 h-14', setas: 'w-4.5 h-4.5', stroke: 2.5, raio: 24, dash: '40 111' },
} as const

/**
 * Indicador de carregamento refinado, minimalista e fluido:
 * - Círculo no tamanho ideal (44px)
 * - As 2 setinhas >> em tamanho reduzido e opacidade sutil e suave
 * - Borda circular roxa fina e fluida em rotação contínua
 * - Tipografia clean logo abaixo
 */
export function LoadingTela({
  mensagem = 'Carregando…',
  tamanho = 'md',
  telaCheia = false,
  className = '',
}: LoadingTelaProps) {
  const dim = CONFIG_TAMANHO[tamanho]

  const conteudo = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Contêiner circular do Loader */}
      <div className={`relative flex items-center justify-center ${dim.caixa}`}>
        {/* Borda circular roxa fluida */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_1.8s_linear_infinite]"
          viewBox="0 0 54 54"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Trilho de fundo (borda sutil) */}
          <circle
            cx="27"
            cy="27"
            r={dim.raio}
            stroke="var(--color-brand-purple, #6e226b)"
            strokeOpacity="0.12"
            strokeWidth={dim.stroke}
          />
          {/* Arco roxo ativo minimalista */}
          <circle
            cx="27"
            cy="27"
            r={dim.raio}
            stroke="var(--color-brand-purple, #6e226b)"
            strokeWidth={dim.stroke}
            strokeDasharray={dim.dash}
            strokeLinecap="round"
          />
        </svg>

        {/* As 2 setinhas >> em roxo suave e elegante */}
        <svg
          className={`${dim.setas} shrink-0 transition-opacity`}
          viewBox="96 98 126 116"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill="var(--color-brand-purple, #6e226b)"
            fillOpacity="0.45"
            d="M107.93,210.81c-2.25,0-4.52-.86-6.25-2.59-3.48-3.45-3.48-9.06,0-12.52l44.99-45-46-46c-3.45-3.45-3.45-9.07,0-12.52,3.45-3.46,9.07-3.46,12.52,0l52.25,52.26c3.46,3.45,3.46,9.07,0,12.52l-51.24,51.25c-1.73,1.72-4.01,2.59-6.28,2.59h.02Z"
          />
          <path
            fill="var(--color-brand-purple, #6e226b)"
            fillOpacity="0.45"
            d="M216.02,156.84l-51.24,51.25c-1.73,1.72-4,2.59-6.27,2.59s-4.54-.86-6.25-2.59c-3.48-3.45-3.48-9.06,0-12.52l44.99-45-46-46c-3.46-3.45-3.46-9.07,0-12.52,3.45-3.46,9.04-3.46,12.52,0l52.25,52.27c3.48,3.45,3.48,9.07,0,12.52Z"
          />
        </svg>
      </div>

      {/* Texto referente ao carregamento da tela com respiração lenta e suave */}
      {mensagem && (
        <>
          <style>{`
            @keyframes carregandoPulsoSuave {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.65; }
            }
          `}</style>
          <p
            className="text-xs font-medium tracking-tight text-center"
            style={{
              color: 'var(--color-muted-foreground)',
              animation: 'carregandoPulsoSuave 2.4s ease-in-out infinite',
            }}
          >
            {mensagem}
          </p>
        </>
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
    <div className="flex-1 min-h-[300px] w-full flex items-center justify-center p-6">
      {conteudo}
    </div>
  )
}
