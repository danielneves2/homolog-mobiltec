import { useState } from 'react'
import { useTransicaoStatus } from '@/hooks/useHomologacao'
import { ErroApi } from '@/lib/api'
import { exigeJustificativa } from '@/lib/tipos'
import type { ColunaMatriz } from '@/lib/tipos'

/**
 * Finalizar = fechar a homologação (spec §7.5).
 *
 * O backend faz `RASCUNHO → EM_REVISAO → APROVADO` em dois passos; aqui as
 * duas transições são encadeadas.
 *
 * **A pendência não trava.** Item não testado e divergência sem justificativa
 * aparecem como checklist do que ficou para trás, mas os dois botões seguem
 * ativos: quem fecha é o time de homologação, quem valida e assina é o
 * gerente de produto (decisão do usuário — DECISOES, Etapa 33).
 *
 * `homologado` é decisão manual (spec §11.5) — daí os dois botões distintos,
 * em vez de deduzir do resultado dos testes.
 */
export function ModalFinalizar({
  coluna,
  aoFechar,
  aoFinalizar,
}: {
  coluna: ColunaMatriz
  aoFechar: () => void
  aoFinalizar: () => void
}) {
  const transicao = useTransicaoStatus(coluna.homologacao.id)
  const [erro, setErro] = useState<string | null>(null)

  const resultados = coluna.homologacao.resultados
  const naoTestados = resultados.filter((r) => r.status === 'NAO_TESTADO').length
  const semJustificativa = resultados.filter(
    (r) => exigeJustificativa(r.status) && !r.justificativaId && !r.justificativaTexto,
  ).length
  const semAssinatura = !(
    coluna.homologacao.assinaturaResponsavel?.trim() || coluna.homologacao.responsavel?.nome
  )

  const pendencias = [
    naoTestados > 0 && `${naoTestados} item(ns) ainda não testado(s)`,
    semJustificativa > 0 &&
      `${semJustificativa} divergência(s) sem justificativa — saem em branco no certificado`,
  ].filter(Boolean) as string[]

  const completa = pendencias.length === 0

  function finalizar(homologado: boolean) {
    setErro(null)
    // RASCUNHO → EM_REVISAO → APROVADO. Se já estiver em revisão, o primeiro
    // passo devolve 422 de transição inválida — daí o encadeamento tolerante.
    const aprovar = () =>
      transicao.mutate(
        { novoStatus: 'APROVADO', homologado },
        {
          onSuccess: aoFinalizar,
          onError: (e) =>
            setErro(e instanceof ErroApi ? e.message : 'Não foi possível finalizar.'),
        },
      )

    if (coluna.homologacao.status === 'RASCUNHO') {
      transicao.mutate(
        { novoStatus: 'EM_REVISAO' },
        {
          onSuccess: aprovar,
          onError: (e) =>
            setErro(e instanceof ErroApi ? e.message : 'Não foi possível enviar para revisão.'),
        },
      )
    } else {
      aprovar()
    }
  }

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
        onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
        className="w-full max-w-lg rounded-xl border shadow-xl"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Finalizar homologação</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
            {coluna.homologacao.dispositivo.nomeComercial} · agente{' '}
            {coluna.homologacao.versaoAgente}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {completa ? (
            <div
              className="px-3 py-2.5 rounded-md text-sm"
              style={{ background: 'var(--color-status-ok-soft)', color: 'var(--color-status-ok)' }}
            >
              ✓ Todos os {resultados.length} itens avaliados e todas as divergências justificadas.
            </div>
          ) : (
            // Aviso, não bloqueio: a cor é âmbar e os botões continuam ativos.
            <div
              data-pendencias
              className="px-3 py-2.5 rounded-md text-sm"
              style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning-fg)' }}
            >
              <p className="font-semibold mb-1">Fica pendente:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {pendencias.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-1.5 opacity-90">
                Dá para finalizar assim — a validação e a assinatura são do gerente de produto.
              </p>
            </div>
          )}

          {semAssinatura && (
            <div
              className="px-3 py-2.5 rounded-md text-sm"
              style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning-fg)' }}
            >
              O certificado está sem nome na assinatura do Responsável Técnico. Dá para finalizar
              assim, mas o documento sai com a linha em branco.
            </div>
          )}

          <div
            className="px-3 py-2.5 rounded-md text-sm"
            style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            Depois de finalizada, a homologação fica <strong>somente leitura</strong>. Para mexer
            de novo é preciso reabrir, e a reabertura fica registrada em log.
          </div>

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

        <div className="p-5 border-t flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-2 rounded-md text-sm"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={transicao.isPending}
              onClick={() => finalizar(false)}
              title="Fecha a homologação registrando que o dispositivo NÃO foi homologado"
              className="px-4 py-2 rounded-md text-sm font-medium border disabled:opacity-50"
              style={{
                borderColor: 'var(--color-status-falha)',
                color: 'var(--color-status-falha)',
              }}
            >
              Não homologado
            </button>
            <button
              type="button"
              disabled={transicao.isPending}
              onClick={() => finalizar(true)}
              className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-status-ok)' }}
            >
              {transicao.isPending ? 'Finalizando…' : 'Homologado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
