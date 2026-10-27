import { Link } from 'react-router-dom'
import { META_STATUS, ROTULO_STATUS_HOMOLOGACAO, obterRotuloGrupo, rotuloVersao } from '@/lib/tipos'
import type { ComparacaoVersao, Homologacao, StatusHomologacao, StatusResultado } from '@/lib/tipos'

/**
 * Versões do modelo e o que mudou da anterior para esta (D522).
 *
 * É a pergunta que um reteste existe para responder — "o que a versão nova
 * do agente mudou?" — e que antes não aparecia em lugar nenhum: o histórico
 * estava no banco, mas a tela só mostrava a versão atual.
 *
 * Mora na ficha ("Exibir informações") e na validação do certificado, onde
 * quem aprova vê de cara o que piorou.
 */
export function VersoesHomologacao({
  homologacao,
  semNavegacao = false,
}: {
  homologacao: Homologacao
  /** Na validação (modal) a lista de versões não aparece: só a comparação */
  semNavegacao?: boolean
}) {
  const versoes = homologacao.versoes ?? []
  const comparacao = homologacao.comparacao
  if (versoes.length < 2 && !comparacao) return null

  return (
    <section className="mt-6 rounded-xl border p-5" style={{ background: 'var(--color-card)' }} data-versoes-modelo>
      {!semNavegacao && versoes.length > 1 && (
        <>
          <h2 className="label-caps mb-2.5">Versões deste modelo</h2>
          <div className="flex flex-wrap gap-2">
            {versoes.map((v) => {
              const esta = v.id === homologacao.id
              return (
                <Link
                  key={v.id}
                  to={`/dispositivos/${v.id}`}
                  aria-current={esta || undefined}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-brand-purple-border)] hover:bg-[var(--color-brand-purple-soft)]"
                  style={
                    esta
                      ? { borderColor: 'var(--color-brand-purple-border)', background: 'var(--color-brand-purple-soft)' }
                      : undefined
                  }
                >
                  <span className={esta ? 'font-semibold text-[var(--color-primary)]' : 'font-medium'}>
                    {rotuloVersao(v)}
                  </span>
                  <SeloVersao status={v.status} />
                </Link>
              )
            })}
          </div>
        </>
      )}

      {comparacao && (
        <div className={!semNavegacao && versoes.length > 1 ? 'mt-5 border-t pt-4' : ''}>
          <Comparacao comparacao={comparacao} gerenciamento={homologacao.gerenciamento} titulos={homologacao.dispositivo?.categoria?.gruposTitulos} />
        </div>
      )}
    </section>
  )
}

/** Quanto melhor o resultado, maior. N/A e não testado ficam fora da escala */
const PESO: Partial<Record<StatusResultado, number>> = { OK: 3, COM_RESSALVA: 2, FALHA: 1, NAO_SUPORTADO: 1 }

function Comparacao({
  comparacao,
  gerenciamento,
  titulos,
}: {
  comparacao: ComparacaoVersao
  gerenciamento: string
  titulos?: Record<string, string>
}) {
  const pioraram: ComparacaoVersao['mudancas'] = []
  const melhoraram: ComparacaoVersao['mudancas'] = []
  const primeiraVez: ComparacaoVersao['mudancas'] = []
  const aTestar: ComparacaoVersao['mudancas'] = []
  const outras: ComparacaoVersao['mudancas'] = []
  for (const m of comparacao.mudancas) {
    const antes = m.antes ? PESO[m.antes] : undefined
    const agora = PESO[m.agora]
    if (antes !== undefined && agora !== undefined) (agora < antes ? pioraram : melhoraram).push(m)
    else if (m.agora === 'NAO_TESTADO') aTestar.push(m)
    // Item novo na matriz, ou que a versão anterior não chegou a avaliar
    else if (!m.antes || m.antes === 'NAO_TESTADO') primeiraVez.push(m)
    else outras.push(m)
  }

  const versao = rotuloVersao({ ...comparacao, gerenciamento })

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label-caps">O que mudou em relação à versão anterior</h2>
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {versao} · {ROTULO_STATUS_HOMOLOGACAO[comparacao.status].toLowerCase()}
        </span>
      </div>

      {comparacao.mudancas.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Nenhum item mudou de resultado: a versão nova se comporta como a anterior.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <Grupo titulo="Pioraram" cor="#b91c1c" itens={pioraram} titulos={titulos} />
          <Grupo titulo="Melhoraram" cor="var(--color-primary)" itens={melhoraram} titulos={titulos} />
          <Grupo titulo="Testados pela primeira vez" cor="var(--color-foreground)" itens={primeiraVez} titulos={titulos} />
          <Grupo titulo="Outras mudanças" cor="var(--color-foreground)" itens={outras} titulos={titulos} />
          <Grupo titulo="Ainda não testados nesta versão" cor="var(--color-muted-foreground)" itens={aTestar} titulos={titulos} recolhido />
        </div>
      )}
    </>
  )
}

function Grupo({
  titulo,
  cor,
  itens,
  titulos,
  recolhido = false,
}: {
  titulo: string
  cor: string
  itens: ComparacaoVersao['mudancas']
  titulos?: Record<string, string>
  /** Lista longa e pouco informativa: começa fechada */
  recolhido?: boolean
}) {
  if (itens.length === 0) return null
  const lista = (
    <ul className="mt-1.5 divide-y rounded-lg border">
      {itens.map((m) => (
        <li key={m.itemId} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
          <span className="min-w-0">
            <span className="font-medium">{m.nome}</span>
            <span className="ml-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
              · {obterRotuloGrupo(m.grupo, titulos)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {m.antes ? <Status s={m.antes} /> : <span style={{ color: 'var(--color-muted-foreground)' }}>item novo</span>}
            <span aria-hidden style={{ color: 'var(--color-muted-foreground)' }}>→</span>
            <Status s={m.agora} />
          </span>
        </li>
      ))}
    </ul>
  )
  const cabecalho = (
    <span className="text-xs font-semibold" style={{ color: cor }}>
      {titulo} <span className="font-normal opacity-70">({itens.length})</span>
    </span>
  )
  return recolhido ? (
    <details>
      <summary className="cursor-pointer select-none">{cabecalho}</summary>
      {lista}
    </details>
  ) : (
    <div>
      {cabecalho}
      {lista}
    </div>
  )
}

function Status({ s }: { s: StatusResultado }) {
  const m = META_STATUS[s]
  return (
    <span className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: m.corFill, color: m.cor }}>
      {m.rotulo}
    </span>
  )
}

/** Selo de uma versão: roxo homologado, vermelho reprovado, laranja o que está aberto */
export function SeloVersao({ status }: { status: StatusHomologacao }) {
  const cor =
    status === 'APROVADO' || status === 'PUBLICADO'
      ? { bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' }
      : status === 'REPROVADO'
        ? { bg: '#fee2e2', fg: '#b91c1c' }
        : { bg: 'rgba(243,120,4,0.12)', fg: '#c2410c' }
  return (
    <span className="rounded-full px-1.5 py-px text-[10px] font-semibold" style={{ background: cor.bg, color: cor.fg }}>
      {status === 'RASCUNHO' ? 'Em teste' : ROTULO_STATUS_HOMOLOGACAO[status]}
    </span>
  )
}
