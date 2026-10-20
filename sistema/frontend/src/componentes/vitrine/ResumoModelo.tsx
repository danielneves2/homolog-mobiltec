import { BadgeHomologado } from '@/componentes/comum/BadgeHomologado'
import { FotoDispositivo } from '@/componentes/vitrine/FotoDispositivo'
import { ehGerenciamentoIos } from '@/lib/tipos'
import type { StatusHomologacao, TipoGerenciamento } from '@/lib/tipos'

/**
 * Topo e miolo do card de um modelo em teste (D513).
 *
 * É o visual do card do painel do parceiro; o Painel Mobiltec usa as mesmas
 * peças nas abas Em homologação e Retestados, sem o rodapé de ações. Um
 * componente só para as duas telas não deixa os cards se desencontrarem.
 */

const ROTULO_CURTO_GERENCIAMENTO: Record<TipoGerenciamento, string> = {
  ANDROID_LEGADO: 'Legado',
  ANDROID_ENTERPRISE: 'Enterprise',
  IOS_BYOD: 'BYOD',
  IOS_SUPERVISIONADO: 'Supervisionado',
}

const STATUS_PROCESSO: Record<StatusHomologacao, { rotulo: string; bg: string; fg: string }> = {
  RASCUNHO: { rotulo: 'Em homologação', bg: '#f1f5f9', fg: '#475569' },
  // Mesmas cores da tela Validar Certificado: validação em roxo, revisão em âmbar
  AGUARDANDO_ANALISE: { rotulo: 'Em validação', bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
  EM_REVISAO: { rotulo: 'Em revisão', bg: '#fef3c7', fg: '#b45309' },
  APROVADO: { rotulo: 'Homologado', bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
  PUBLICADO: { rotulo: 'Homologado', bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
  REPROVADO: { rotulo: 'Reprovado', bg: '#fee2e2', fg: '#b91c1c' },
}

export function BadgeStatusProcesso({ status }: { status: StatusHomologacao }) {
  const conf = STATUS_PROCESSO[status] ?? STATUS_PROCESSO.RASCUNHO
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap select-none"
      style={{ background: conf.bg, color: conf.fg }}
    >
      {conf.rotulo}
    </span>
  )
}

/** Fabricante · tipo, nome do modelo e o selo do status */
export function CabecalhoModelo({
  fabricante,
  categoriaNome,
  nomeComercial,
  status,
}: {
  fabricante: string
  categoriaNome: string
  nomeComercial: string
  status: StatusHomologacao
}) {
  return (
    <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b">
      <div className="min-w-0 flex-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider block truncate"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {fabricante} · {categoriaNome}
        </span>
        <h3 className="text-sm font-bold truncate leading-tight text-[var(--color-foreground)]" title={nomeComercial}>
          {nomeComercial}
        </h3>
      </div>

      <div>
        {status === 'APROVADO' || status === 'PUBLICADO' ? (
          <BadgeHomologado homologado={true} />
        ) : (
          <BadgeStatusProcesso status={status} />
        )}
      </div>
    </div>
  )
}

/** Foto, sistema, agente, gerenciamento e a barra de testes executados */
export function DadosModelo({
  fotoUrl,
  nomeComercial,
  versaoSo,
  versaoAgente,
  gerenciamento,
  avaliados,
  total,
  homologado,
  numeroHomologacao,
}: {
  fotoUrl: string | null
  nomeComercial: string
  versaoSo: string
  versaoAgente: string
  gerenciamento: TipoGerenciamento
  avaliados: number
  total: number
  homologado: boolean
  /** A partir da 2ª, mostra a linha "Homologação" — o modelo já foi retestado */
  numeroHomologacao?: number
}) {
  const ios = ehGerenciamentoIos(gerenciamento)
  const progresso = total > 0 ? Math.round((avaliados / total) * 100) : 0

  return (
    <div className="p-4 flex items-center gap-4">
      <div
        className="h-20 w-20 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center p-1"
        style={{ background: 'var(--color-sidebar)' }}
      >
        <FotoDispositivo url={fotoUrl} nome={nomeComercial} altura={76} semBorda />
      </div>

      <div className="flex-1 min-w-0 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-muted-foreground)]">{ios ? 'iOS:' : 'Android:'}</span>
          <span className="font-semibold text-[var(--color-foreground)]">{versaoSo}</span>
        </div>
        {!ios && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-muted-foreground)]">Agente:</span>
            <span className="font-semibold text-[var(--color-foreground)]">{versaoAgente}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-muted-foreground)]">Gerenciamento:</span>
          <span className="font-medium text-[var(--color-muted-foreground)] truncate max-w-[110px]">
            {ROTULO_CURTO_GERENCIAMENTO[gerenciamento] ?? 'Legado'}
          </span>
        </div>
        {numeroHomologacao !== undefined && numeroHomologacao > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-muted-foreground)]">Homologação:</span>
            <span className="font-medium text-[var(--color-muted-foreground)]">{numeroHomologacao}ª (reteste)</span>
          </div>
        )}

        <div className="pt-1.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-[var(--color-muted-foreground)]">Testes executados:</span>
            <span className="font-semibold text-[var(--color-foreground)]">{progresso}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progresso}%`,
                background: homologado ? 'var(--color-primary)' : 'var(--gradient-brand-purple)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
