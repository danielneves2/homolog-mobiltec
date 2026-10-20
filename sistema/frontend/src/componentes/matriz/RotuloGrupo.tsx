import { ROTULO_GRUPO } from '@/lib/tipos'

/**
 * O rótulo vertical do rail roxo da matriz.
 *
 * Exibe o título completo da bateria de testes na vertical.
 * Ajusta dinamicamente a tipografia para títulos mais longos,
 * garantindo legibilidade perfeita sem corte do texto.
 */
export function RotuloGrupo({ grupo, titulo }: { grupo: string; titulo?: string }) {
  const nomeCompleto = (titulo || (ROTULO_GRUPO as Record<string, string>)[grupo] || grupo).trim()

  // Maior que antes (D505): o título da faixa roxa se lia mal em 10–13px
  const tamanhoFonte =
    nomeCompleto.length > 26
      ? 'text-[12.5px]'
      : nomeCompleto.length > 18
        ? 'text-[13.5px]'
        : 'text-[15px]'

  return (
    <span
      className={`${tamanhoFonte} font-semibold text-white whitespace-nowrap text-center select-none`}
      title={nomeCompleto}
      style={{
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        letterSpacing: '0.04em',
        padding: '6px 0',
      }}
    >
      {nomeCompleto}
    </span>
  )
}
