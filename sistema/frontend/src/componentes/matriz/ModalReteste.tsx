import { useState } from 'react'
import { useAbrirReteste } from '@/hooks/useMatriz'
import { ErroApi } from '@/lib/api'
import { ROTULO_STATUS_HOMOLOGACAO, ehGerenciamentoIos, rotuloVersao } from '@/lib/tipos'
import type { ColunaMatriz } from '@/lib/tipos'

interface Props {
  coluna: ColunaMatriz
  aoFechar: () => void
  aoCriar: () => void
}

/**
 * Abre uma nova homologação para um modelo já cadastrado.
 *
 * Reteste **nunca** sobrescreve (spec §11.2): o histórico por versão de agente
 * é informação de valor. A ficha é copiada da homologação anterior; a coluna
 * da matriz passa a mostrar a nova, e a antiga vira histórico — e, se estava
 * homologada, segue homologada no catálogo até a nova fechar (D519).
 *
 * Só sai de homologação finalizada e com versão nova (D520). Os resultados
 * nascem em "não testado", ou — se o técnico escolher — com os da versão
 * anterior como ponto de partida; a célula mostra o que a versão nova mudar.
 */
export function ModalReteste({ coluna, aoFechar, aoCriar }: Props) {
  const reteste = useAbrirReteste()
  const [erro, setErro] = useState<string | null>(null)

  const atual = coluna.homologacao
  // iOS não tem agente (D502): o que muda de um teste para o outro é o iOS
  const ios = ehGerenciamentoIos(atual.gerenciamento)
  const [versaoAgente, setVersaoAgente] = useState(ios ? atual.versaoAgente : '')
  const [versaoSo, setVersaoSo] = useState(ios ? '' : atual.versaoSo)
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [copiarResultados, setCopiarResultados] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await reteste.mutateAsync({
        dispositivoId: atual.dispositivoId,
        baseHomologacaoId: atual.id,
        versaoAgente: versaoAgente.trim(),
        versaoSo: versaoSo.trim() || atual.versaoSo,
        dataInicio,
        copiarResultados,
      })
      aoCriar()
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível abrir o reteste.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.45)' }}
      onClick={aoFechar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Abrir reteste"
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
        className="w-full max-w-md rounded-xl border shadow-xl"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Abrir reteste</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
            {atual.dispositivo.nomeComercial} — hoje em {rotuloVersao(atual)} (
            {ROTULO_STATUS_HOMOLOGACAO[atual.status].toLowerCase()})
          </p>
        </div>

        <div className="p-5 space-y-4">
          <p
            className="text-xs px-3 py-2 rounded-md"
            style={{ background: 'var(--color-info-soft)', color: 'var(--color-info-fg)' }}
          >
            A versão atual vira histórico e continua acessível — nada é sobrescrito.
            {(atual.status === 'APROVADO' || atual.status === 'PUBLICADO') &&
              ' O modelo segue homologado nela no catálogo até o reteste fechar.'}
          </p>

          <div>
            <label className="label-caps block mb-1.5">
              {ios ? 'Nova versão do iOS' : 'Nova versão do agente'}{' '}
              <span style={{ color: 'var(--color-destructive)' }}>*</span>
            </label>
            <input
              required
              autoFocus
              value={ios ? versaoSo : versaoAgente}
              onChange={(e) => (ios ? setVersaoSo(e.target.value) : setVersaoAgente(e.target.value))}
              placeholder={`Hoje: ${ios ? atual.versaoSo : atual.versaoAgente}`}
              className="w-full px-3 py-2 rounded-md border bg-transparent text-sm"
              style={{ borderColor: 'var(--color-input)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps block mb-1.5">{ios ? 'Versão do agente' : 'Versão do SO'}</label>
              <input
                value={ios ? versaoAgente : versaoSo}
                onChange={(e) => (ios ? setVersaoAgente(e.target.value) : setVersaoSo(e.target.value))}
                className="w-full px-3 py-2 rounded-md border bg-transparent text-sm"
                style={{ borderColor: 'var(--color-input)' }}
              />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent text-sm"
                style={{ borderColor: 'var(--color-input)' }}
              />
            </div>
          </div>

          {/* Ponto de partida: do zero é o padrão — o reteste confirma tudo de
              novo. Partir da anterior serve a quem só vai revalidar o que mudou. */}
          <fieldset className="space-y-1.5">
            <legend className="label-caps mb-1.5">Ponto de partida</legend>
            {[
              { valor: false, titulo: 'Do zero', texto: 'Todos os itens em "não testado".' },
              {
                valor: true,
                titulo: 'Resultados da versão atual',
                texto: `Os itens vêm com o resultado e a justificativa da ${rotuloVersao(atual)} — revise o que mudou.`,
              },
            ].map((o) => (
              <label
                key={String(o.valor)}
                className="flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors"
                style={{
                  borderColor: copiarResultados === o.valor ? 'var(--color-brand-purple-border)' : 'var(--color-border)',
                  background: copiarResultados === o.valor ? 'var(--color-brand-purple-soft)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="ponto-de-partida"
                  checked={copiarResultados === o.valor}
                  onChange={() => setCopiarResultados(o.valor)}
                  className="mt-0.5 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="block font-medium">{o.titulo}</span>
                  <span className="block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {o.texto}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {erro && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-md text-sm"
              style={{
                background: 'var(--color-destructive-soft)',
                color: 'var(--color-destructive-fg)',
              }}
            >
              {erro}
            </div>
          )}
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-2 rounded-md text-sm"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={reteste.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--gradient-brand-purple)' }}
          >
            {reteste.isPending ? 'Abrindo…' : 'Abrir reteste'}
          </button>
        </div>
      </form>
    </div>
  )
}
