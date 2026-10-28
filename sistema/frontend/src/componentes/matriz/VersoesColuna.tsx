import { useNavigate } from 'react-router-dom'
import { rotuloVersao } from '@/lib/tipos'
import type { ColunaMatriz } from '@/lib/tipos'
import { SeloVersao } from '@/componentes/homologacao/VersoesHomologacao'

/**
 * As versões de um modelo (D522), abertas pelo menu ☰ da coluna.
 *
 * Não mora no cabeçalho: uma segunda linha de texto numa só coluna esticava a
 * faixa roxa de todas — a altura mudava conforme os filtros. Cada versão abre
 * a própria ficha: resultado item a item, certificado e o que mudou.
 */
export function ModalVersoes({ coluna, aoFechar }: { coluna: ColunaMatriz; aoFechar: () => void }) {
  const navegar = useNavigate()
  const atual = coluna.homologacao
  const versoes = [
    { id: atual.id, versaoAgente: atual.versaoAgente, versaoSo: atual.versaoSo, status: atual.status, data: atual.dataInicio },
    ...coluna.homologacoesAnteriores.map((h) => ({ ...h, data: h.dataFim ?? h.dataInicio })),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.45)' }}
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Versões do modelo"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border shadow-xl outline-none"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Versões testadas</h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {atual.dispositivo.nomeComercial}
          </p>
        </div>
        <div className="py-1.5">
          {versoes.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                aoFechar()
                navegar(`/dispositivos/${v.id}`)
              }}
              className="flex w-full items-center gap-2 px-5 py-2 text-left text-sm transition-colors hover:bg-[var(--color-brand-purple-soft)]"
            >
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="truncate font-semibold">
                  {rotuloVersao({ ...v, gerenciamento: atual.gerenciamento })}
                  {i === 0 && (
                    <span className="ml-1.5 font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                      (esta coluna)
                    </span>
                  )}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {new Date(v.data).toLocaleDateString('pt-BR')}
                </span>
              </span>
              <SeloVersao status={v.status} />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Clique numa versão para abrir a ficha dela.
          </span>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-md px-3 py-1.5 text-sm"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
