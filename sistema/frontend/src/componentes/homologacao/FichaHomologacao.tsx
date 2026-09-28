import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FotoDispositivo } from '@/componentes/vitrine/FotoDispositivo'
import { Icone } from '@/componentes/Icone'
import { ancorarMenu } from '@/lib/ancorarMenu'
import { parseObservacaoItem } from '@/lib/observacoes'
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
  justificativa?: string | null
  tituloJustificativa?: string | null
}

const LARGURA_STATUS = '8.75rem'
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
      responsavelTecnico: (() => {
        const aprovacao = h.historicoStatus?.find((hist) => hist.statusNovo === 'APROVADO')
        const adminAprovador = aprovacao?.usuario?.nome
        if (adminAprovador) return adminAprovador
        if (h.responsavel?.nome && !h.responsavel.nome.toLowerCase().includes('matheus')) {
          return h.responsavel.nome
        }
        if (h.assinaturaResponsavel?.trim() && !h.assinaturaResponsavel.toLowerCase().includes('matheus')) {
          return h.assinaturaResponsavel.trim()
        }
        return 'Daniel Neves Lima'
      })(),
      gerenteValidacao: h.assinaturaGerente?.trim() || h.gerente?.nome || 'Rafael Cordeiro',
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

/** Ícone circular roxo de dúvida com tooltip flutuante ancorado para justificativas */
function IconeDuvidaJustificativa({
  titulo,
  texto,
}: {
  titulo?: string | null
  texto?: string | null
}) {
  const [visivel, setVisivel] = useState(false)
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null)
  const refBotao = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrar = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (refBotao.current) {
      const rect = refBotao.current.getBoundingClientRect()
      const pos = ancorarMenu(rect, { largura: 300, altura: 120 }, 8, 'fim')
      setPosicao(pos)
      setVisivel(true)
    }
  }

  const esconder = () => {
    timeoutRef.current = setTimeout(() => {
      setVisivel(false)
    }, 150)
  }

  const cancelarEsconder = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!texto && !titulo) return null

  const textoFallback = [titulo, texto].filter(Boolean).join(': ')

  return (
    <>
      <button
        ref={refBotao}
        type="button"
        onMouseEnter={mostrar}
        onMouseLeave={esconder}
        onFocus={mostrar}
        onBlur={esconder}
        onClick={(e) => {
          e.stopPropagation()
          if (visivel) setVisivel(false)
          else mostrar()
        }}
        aria-label="Ver justificativa"
        title={textoFallback}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs transition-all hover:scale-115 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 cursor-help"
        style={{
          background: 'var(--color-primary, #631B5B)',
        }}
      >
        ?
      </button>

      {visivel &&
        posicao &&
        createPortal(
          <div
            role="tooltip"
            onMouseEnter={cancelarEsconder}
            onMouseLeave={esconder}
            className="fixed z-[9999] w-72 max-w-[90vw] rounded-xl border p-3 text-left shadow-2xl transition-all"
            style={{
              left: posicao.x,
              top: posicao.y,
              background: 'var(--color-popover, #ffffff)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-foreground)',
              boxShadow: '0 12px 30px -4px rgba(99, 27, 91, 0.25), 0 4px 12px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div
              className="flex items-center gap-1.5 mb-1.5 pb-1 border-b text-[11px] font-bold uppercase tracking-wider"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary, #631B5B)',
              }}
            >
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: 'var(--color-primary, #631B5B)' }}
              >
                ?
              </span>
              <span>Justificativa</span>
            </div>

            {titulo && (
              <p className="text-xs font-semibold text-foreground leading-snug mb-1">
                {titulo}
              </p>
            )}

            {texto && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {texto}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
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
    const linhas: LinhaResultado[] = (homologacao.resultados ?? []).map((r) => {
      const rawTexto = r.justificativaTexto ?? r.justificativa?.texto ?? null
      const parsedTexto = rawTexto ? parseObservacaoItem(rawTexto).texto : ''
      const textoFinal = parsedTexto.trim() || rawTexto?.trim() || null
      const tituloFinal = r.justificativa?.titulo?.trim() || null

      return {
        id: r.id,
        grupo: r.item.grupo,
        nome: r.item.nome,
        acao: r.item.descricaoAcao,
        status: r.status,
        justificativa: textoFinal,
        tituloJustificativa: tituloFinal,
      }
    })

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
                        <div className="inline-flex items-center justify-end gap-1.5">
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
                          {(l.justificativa || l.tituloJustificativa) && (
                            <IconeDuvidaJustificativa
                              titulo={l.tituloJustificativa}
                              texto={l.justificativa}
                            />
                          )}
                        </div>
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
