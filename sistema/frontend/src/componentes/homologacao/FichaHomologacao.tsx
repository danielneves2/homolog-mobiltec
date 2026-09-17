import { useMemo } from 'react'
import { FotoDispositivo } from '@/componentes/vitrine/FotoDispositivo'
import { Icone } from '@/componentes/Icone'
import {
  GRUPO_ORDEM,
  META_STATUS,
  ROTULO_GERENCIAMENTO,
  obterColunasGrupo,
  obterRotuloGrupo,
  somenteVersaoAndroid,
} from '@/lib/tipos'
import type { GrupoItem, Homologacao, StatusResultado } from '@/lib/tipos'

/** Uma linha do resultado, no formato que esta ficha desenha */
interface LinhaResultado {
  id: string
  grupo: GrupoItem
  nome: string
  acao: string
  status: StatusResultado
}

const LARGURA_STATUS = '7.5rem'
const LARGURA_ITEM = '28%'

/** A identificação da unidade que foi para a bancada: foto e ficha técnica. */
export function FichaUnidadeTestada({
  homologacao,
  aoEditarFoto,
}: {
  homologacao: Homologacao
  aoEditarFoto?: () => void
}) {
  const ficha = useMemo(() => {
    const h = homologacao
    return {
      nomeComercial: h.dispositivo?.nomeComercial ?? '—',
      fotoUrl: h.dispositivo?.fotoUrl ?? null,
      versaoSo: h.versaoSo,
      versaoAgente: h.versaoAgente,
      versaoPos: h.versaoPos,
      tipoAgente: h.tipoAgente,
      gerenciamento: h.gerenciamento,
      metodoInscricao: h.metodoInscricao,
      responsavelTecnico: h.assinaturaResponsavel?.trim() || h.responsavel?.nome || null,
      gerenteValidacao: h.assinaturaGerente?.trim() || h.gerente?.nome || null,
      dataInicio: h.dataInicio,
      dataFim: h.dataFim,
    }
  }, [homologacao])

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex flex-col items-center gap-2">
        <div
          className="group relative w-48 shrink-0 self-center overflow-hidden rounded-xl border transition-all"
          style={{ background: 'var(--color-sidebar)' }}
        >
          <FotoDispositivo url={ficha.fotoUrl} nome={ficha.nomeComercial} altura={192} semBorda />
          {aoEditarFoto && (
            <button
              type="button"
              onClick={aoEditarFoto}
              title={
                ficha.fotoUrl ? 'Alterar foto do dispositivo' : 'Adicionar foto do dispositivo'
              }
              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 opacity-0 backdrop-blur-[2px] transition-all duration-150 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white shadow-sm">
                <Icone nome="camera" className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-white tracking-wide">
                {ficha.fotoUrl ? 'Alterar foto' : 'Enviar foto'}
              </span>
            </button>
          )}
        </div>

        {aoEditarFoto && (
          <button
            type="button"
            onClick={aoEditarFoto}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-primary cursor-pointer"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <Icone nome="camera" className="h-3.5 w-3.5" />
            <span>{ficha.fotoUrl ? 'Alterar foto' : 'Enviar foto'}</span>
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="label-caps mb-3">Unidade testada</p>
        <dl className="grid gap-x-8 gap-y-2.5 text-sm [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <Campo rotulo="Android" valor={somenteVersaoAndroid(ficha.versaoSo)} />
          <Campo rotulo="Versão do agente" valor={ficha.versaoAgente} />
          <Campo rotulo="Tipo de agente" valor={ficha.tipoAgente} />
          <Campo rotulo="Versão PoS" valor={ficha.versaoPos} />
          <Campo rotulo="Gerenciamento" valor={ROTULO_GERENCIAMENTO[ficha.gerenciamento]} />
          <Campo rotulo="Método de inscrição" valor={ficha.metodoInscricao} />
          <Campo rotulo="Início" valor={formatarData(ficha.dataInicio)} />
          <Campo rotulo="Conclusão" valor={formatarData(ficha.dataFim)} />
          <Campo rotulo="Responsável técnico" valor={ficha.responsavelTecnico} />
          <Campo rotulo="Gerente de validação" valor={ficha.gerenteValidacao} />
        </dl>
      </div>
    </div>
  )
}

/** O checklist da bateria, grupo a grupo — estritamente tabular. */
export function ResultadoHomologacao({
  homologacao,
  semTitulo = false,
}: {
  homologacao: Homologacao
  semTitulo?: boolean
  onAmpliarImagem?: (img: { url: string; nome: string }) => void
}) {
  const porGrupo = useMemo(() => {
    const linhas: LinhaResultado[] = (homologacao.resultados ?? []).map((r) => ({
      id: r.id,
      grupo: r.item.grupo,
      nome: r.item.nome,
      acao: r.item.descricaoAcao,
      status: r.status,
    }))

    const gruposPresentes = Array.from(new Set(linhas.map((l) => l.grupo)))
    const todosGrupos = [
      ...GRUPO_ORDEM,
      ...gruposPresentes.filter((g) => !GRUPO_ORDEM.includes(g as any)),
    ]

    return todosGrupos
      .map((g) => ({ grupo: g, itens: linhas.filter((l) => l.grupo === g) }))
      .filter((g) => g.itens.length > 0)
  }, [homologacao])

  return (
    <section className={semTitulo ? '' : 'mt-6'}>
      {!semTitulo && <h2 className="label-caps mb-3">Resultado da homologação</h2>}

      <div className="space-y-5">
        {porGrupo.map(({ grupo, itens }) => (
          <div
            key={grupo}
            className="overflow-hidden rounded-lg border"
            style={{ background: 'var(--color-card)' }}
          >
            <div
              className="px-4 py-2 text-xs font-semibold uppercase"
              style={{
                background: 'var(--gradient-brand-purple)',
                color: '#fff',
                letterSpacing: '0.08em',
              }}
            >
              {obterRotuloGrupo(grupo)}
            </div>

            <table className="w-full text-[13px] leading-snug">
              <colgroup>
                <col style={{ width: LARGURA_ITEM }} />
                <col />
                <col style={{ width: LARGURA_STATUS }} />
              </colgroup>
              <thead data-colunas>
                <tr
                  className="text-left text-[11px] font-semibold uppercase"
                  style={{
                    background: 'var(--color-muted)',
                    color: 'var(--color-primary)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {(() => {
                    const colunas = obterColunasGrupo(grupo)
                    return (
                      <>
                        <th className="py-2 pl-4 pr-3 font-semibold whitespace-nowrap">
                          {colunas[0]}
                        </th>
                        <th className="py-2 pr-3 font-semibold">{colunas[1]}</th>
                        <th className="py-2 pr-4 text-right font-semibold">
                          {colunas[2]}
                        </th>
                      </>
                    )
                  })()}
                </tr>
              </thead>
              <tbody>
                {itens.map((l) => {
                  return (
                    <tr key={l.nome} className="border-t align-middle hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pl-4 pr-3 font-semibold text-foreground whitespace-nowrap">
                        {l.nome}
                      </td>
                      <td className="py-2.5 pr-3" style={{ color: 'var(--color-muted-foreground)' }}>
                        <div className="leading-snug text-foreground/90">{l.acao}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span
                          className="inline-block rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-2xs"
                          style={{
                            background: META_STATUS[l.status].corFill,
                            color: META_STATUS[l.status].cor,
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          {META_STATUS[l.status].rotulo}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-2">
      <dt style={{ color: 'var(--color-muted-foreground)' }}>{rotulo}</dt>
      <dd className="truncate font-medium" title={valor ?? undefined}>
        {valor || '—'}
      </dd>
    </div>
  )
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}
