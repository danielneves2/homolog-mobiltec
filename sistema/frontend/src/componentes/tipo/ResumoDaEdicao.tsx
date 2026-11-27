import type { ResumoEdicao } from '@/hooks/useTipoDispositivo'

/**
 * O que a edição fez, dito na volta.
 *
 * Existe por causa de um caso concreto: a tela voltava calada, e não dava para
 * distinguir uma edição que salvou de uma que não salvou. O aviso também é
 * onde se diz que resultado de item retirado não foi jogado fora.
 */
export function ResumoDaEdicao({
  nome,
  resumo,
  aoFechar,
}: {
  nome: string
  resumo: ResumoEdicao
  aoFechar: () => void
}) {
  const { adicionados, removidos, preservados } = resumo
  const mudou = adicionados > 0 || removidos > 0

  return (
    <div
      role="status"
      className="rounded-lg border px-4 py-3 text-sm"
      style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-primary)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold">"{nome}" salvo.</p>

          <p className="mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {mudou ? (
              <>
                {adicionados > 0 &&
                  `${adicionados} ${adicionados === 1 ? 'item entrou' : 'itens entraram'} na bateria`}
                {adicionados > 0 && removidos > 0 && ' · '}
                {removidos > 0 &&
                  `${removidos} ${removidos === 1 ? 'item saiu' : 'itens saíram'} da bateria`}
                .
              </>
            ) : (
              'Nenhum item entrou ou saiu da bateria.'
            )}
          </p>

          {preservados.length > 0 && (
            <div
              className="mt-2 rounded-md px-3 py-2"
              style={{ background: 'var(--color-card)' }}
            >
              <p className="font-medium">
                {preservados.length === 1
                  ? 'Uma linha saiu com avaliação registrada'
                  : `${preservados.length} linhas saíram com avaliação registrada`}
                :
              </p>
              <p className="mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {preservados.join(', ')} — o que já estava preenchido ficou guardado e volta
                inteiro se você remarcar o item. Nada foi apagado.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar aviso"
          className="shrink-0 px-1 hover:opacity-70"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
