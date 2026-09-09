import { useState } from 'react'
import { META_STATUS } from '@/lib/tipos'
import type { ColunaMatriz, ItemTeste } from '@/lib/tipos'

/**
 * As observações que a importação da planilha escreveu, e que ninguém digitou.
 *
 * O campo `resultado.observacao` guarda as duas coisas: o que o técnico anota
 * e o que o importador registrou para explicar como traduziu cada célula da
 * planilha antiga. O caderno mostra só as primeiras — o técnico não escreveu
 * as outras e não as reconhece como suas.
 *
 * O critério é a assinatura do próprio importador: **toda** nota que ele gera
 * cita a planilha de origem (ver `prisma/importar-planilha.ts`). Se um dia o
 * importador mudar o texto, esta lista muda junto.
 */
const ehNotaDaImportacao = (texto: string) =>
  /planilha de origem|planilha:|na planilha|Planilha:/i.test(texto)

/**
 * Caderno da homologação: o rascunho geral do técnico e, abaixo, as anotações
 * que ele foi deixando célula a célula.
 *
 * As duas coisas moram em lugares diferentes no banco — `homologacao.observacoes`
 * e `resultado.observacao` — mas respondem à mesma pergunta ("o que eu vi
 * enquanto testava?"), e antes disso as notas de item só existiam dentro do
 * menu de cada célula, uma a uma. Aqui elas aparecem juntas, prontas para
 * virar a pergunta ao dev.
 *
 * A lista é somente leitura: cada nota se edita na célula de onde saiu, e
 * duplicar a edição em dois lugares só criaria conflito.
 */
export function ModalObservacoesHomologacao({
  coluna,
  itens,
  salvando,
  aoSalvar,
  aoFechar,
}: {
  coluna: ColunaMatriz
  /** Itens da matriz: o payload das colunas traz só `itemId`, não o item */
  itens: ItemTeste[]
  salvando: boolean
  aoSalvar: (texto: string) => void
  aoFechar: () => void
}) {
  const [texto, setTexto] = useState(coluna.homologacao.observacoes ?? '')

  // Percorrer `itens` em vez de `resultados` dá de graça a ordem da planilha
  const anotacoes = itens
    .map((item) => ({ item, r: coluna.homologacao.resultadosPorItem[item.id] }))
    .filter(({ r }) => r?.observacao?.trim() && !ehNotaDaImportacao(r.observacao!))
    .map(({ item, r }) => ({
      item: item.nome,
      status: r!.status,
      texto: r!.observacao!.trim(),
    }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.45)' }}
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') aoFechar()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) aoSalvar(texto)
        }}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border shadow-xl"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Observações</h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {coluna.homologacao.dispositivo.nomeComercial}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="label-caps mb-2">Observação geral</p>
          <textarea
            autoFocus
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Comportamentos observados durante a homologação — o que sai daqui vira a pergunta para o dev, e da resposta dele sai a justificativa do item. Não entra no certificado."
            className="w-full resize-y rounded-md border bg-transparent p-3 text-sm leading-relaxed"
            style={{ borderColor: 'var(--color-input)' }}
          />

          <div className="mt-6">
            <p className="label-caps mb-2">
              Anotações por funcionalidade
              <span className="ml-1.5 font-normal opacity-60">{anotacoes.length}</span>
            </p>

            {anotacoes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Nenhuma ainda. As notas que você deixar em "Observação" dentro de uma célula
                aparecem aqui, com o nome da funcionalidade.
              </p>
            ) : (
              <ul data-anotacoes className="space-y-2">
                {anotacoes.map((a) => (
                  <li
                    key={a.item}
                    className="rounded-md border p-3 text-sm"
                    style={{ background: 'var(--color-muted)' }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{a.item}</span>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                        style={{
                          background: META_STATUS[a.status].corFill,
                          color: META_STATUS[a.status].cor,
                        }}
                      >
                        {META_STATUS[a.status].rotulo}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                      {a.texto}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-5">
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <kbd className="font-mono">Esc</kbd> cancela ·{' '}
            <kbd className="font-mono">Ctrl+Enter</kbd> salva
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-md px-4 py-2 text-sm"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => aoSalvar(texto)}
              disabled={salvando}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--gradient-brand-purple)' }}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
