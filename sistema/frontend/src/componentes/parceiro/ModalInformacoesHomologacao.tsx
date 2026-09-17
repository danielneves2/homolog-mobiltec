import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHomologacao } from '@/hooks/useHomologacao'
import { Icone } from '@/componentes/Icone'
import { LoadingTela } from '@/componentes/LoadingTela'
import { BadgeHomologado } from '@/componentes/comum/BadgeHomologado'
import type { DispositivoPainelParceiro, StatusHomologacao, StatusResultado, AnexoObservacao } from '@/lib/tipos'
import {
  GRUPO_ORDEM,
  obterColunasGrupo,
  obterRotuloGrupo,
  obterRotuloGrupoCurto,
} from '@/lib/tipos'
import { parseObservacaoItem, formatarTamanhoArquivo } from '@/lib/observacoes'

interface ItemObservacaoProcessada {
  id: string
  titulo: string
  texto: string
  autorNome?: string
  autorEmail?: string
  data?: string
  criadoEm?: string
  anexos?: AnexoObservacao[]
}

export function parseObservacoes(raw?: string | null): ItemObservacaoProcessada[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx) => ({
        id: item.id || String(idx),
        titulo: item.titulo || item.assunto || 'Observação',
        texto: item.texto || item.mensagem || item.descricao || '',
        autorNome: item.autorNome || item.autor || '',
        autorEmail: item.autorEmail || item.email || '',
        data: item.data || item.criadoEm,
        anexos: item.anexos || [],
      }))
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return [
        {
          id: parsed.id || '1',
          titulo: parsed.titulo || 'Observação',
          texto: parsed.texto || parsed.mensagem || '',
          autorNome: parsed.autorNome,
          autorEmail: parsed.autorEmail || parsed.email || '',
          data: parsed.data || parsed.criadoEm,
          anexos: parsed.anexos || [],
        },
      ]
    }
  } catch {
    // fallback texto puro
  }

  return [
    {
      id: '1',
      titulo: 'Observação do Processo',
      texto: raw.trim(),
    },
  ]
}

interface Props {
  homologacaoId: string
  dispositivo: Partial<DispositivoPainelParceiro> & { nomeComercial: string; status: StatusHomologacao; homologacaoId?: string | null }
  aoFechar: () => void
}

type FiltroItens = 'todos' | 'divergencias' | 'ok' | 'pendentes'

export function ModalInformacoesHomologacao({ homologacaoId, dispositivo: d, aoFechar }: Props) {
  const { data: homologacao, isLoading } = useHomologacao(homologacaoId)
  const [abaAtiva, setAbaAtiva] = useState<'TESTES' | 'OBSERVACOES'>('TESTES')
  const [filtroStatus, setFiltroStatus] = useState<FiltroItens>('todos')
  const [imagemAmpliada, setImagemAmpliada] = useState<{ url: string; nome: string } | null>(null)

  const resultados = homologacao?.resultados ?? []

  // Observações gerais da homologação
  const observacoesGerais = useMemo(() => {
    return parseObservacoes(homologacao?.observacoes ?? d.observacoes)
  }, [homologacao?.observacoes, d.observacoes])

  // Anotações funcionais célula a célula (matriz de testes)
  const anotacoesFuncionalidade = useMemo(() => {
    return resultados
      .filter((r) => r.observacao && r.observacao.trim())
      .map((r) => {
        const parsed = parseObservacaoItem(r.observacao)
        return {
          id: r.id,
          itemNome: r.item?.nome ?? 'Funcionalidade',
          status: r.status,
          texto: parsed.texto,
          anexos: parsed.anexos,
          autorEmail: (r as any).autorEmail || (homologacao?.responsavel as any)?.email || 'admin@mobiltec.com.br',
          atualizadoEm: (r as any).atualizadoEm || homologacao?.atualizadoEm || homologacao?.criadoEm,
        }
      })
  }, [resultados, homologacao])

  const totalObservacoes = observacoesGerais.length + anotacoesFuncionalidade.length

  const resumo = useMemo(() => {
    let ok = 0
    let divergencias = 0
    let pendentes = 0
    let naoAplicavel = 0

    for (const r of resultados) {
      if (r.status === 'OK') ok++
      else if (r.status === 'NAO_TESTADO') pendentes++
      else if (r.status === 'NAO_APLICAVEL') naoAplicavel++
      else if (['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status)) divergencias++
    }

    const total = resultados.length
    const pct = total > 0 ? Math.round(((total - pendentes) / total) * 100) : 0

    return { total, ok, divergencias, pendentes, naoAplicavel, pct }
  }, [resultados])

  const itensExibidos = useMemo(() => {
    let lista = resultados
    if (filtroStatus === 'divergencias') {
      lista = lista.filter((r) => ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status))
    } else if (filtroStatus === 'ok') {
      lista = lista.filter((r) => r.status === 'OK')
    } else if (filtroStatus === 'pendentes') {
      lista = lista.filter((r) => r.status === 'NAO_TESTADO')
    }
    return lista
  }, [resultados, filtroStatus])

  const grupos = useMemo(() => {
    const mapa = new Map<string, any[]>()
    for (const r of itensExibidos) {
      const g = r.item?.grupo ?? 'OUTROS'
      if (!mapa.has(g)) mapa.set(g, [])
      mapa.get(g)!.push(r)
    }
    
    const ordenado: [string, any[]][] = []
    for (const g of GRUPO_ORDEM) {
      if (mapa.has(g)) {
        ordenado.push([g, mapa.get(g)!])
        mapa.delete(g)
      }
    }
    for (const [g, itens] of mapa.entries()) {
      ordenado.push([g, itens])
    }
    
    return ordenado
  }, [itensExibidos])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[64rem] max-h-[95vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {/* Topo do Modal com roxo sutil de fundo */}
        <div
          className="p-5 border-b flex items-start justify-between gap-4 shrink-0"
          style={{
            background: 'rgba(126, 32, 101, 0.04)',
            borderColor: 'rgba(126, 32, 101, 0.12)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {d.fabricante} · {d.categoriaNome ?? 'Dispositivo'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{d.nomeComercial}</h2>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 flex-wrap">
              <span>Android: <strong>{d.versaoSo}</strong></span>
              <span>·</span>
              <span>Agente: <strong>{d.versaoAgente}</strong></span>
              <span>·</span>
              <span>Modo: <strong>{d.gerenciamento === 'ANDROID_ENTERPRISE' ? 'Enterprise' : 'Legado'}</strong></span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={aoFechar}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Fechar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {d.homologado || d.status === 'APROVADO' || d.status === 'PUBLICADO' ? (
              <BadgeHomologado homologado={true} />
            ) : (
              <BadgeStatusModal status={d.status} />
            )}
          </div>
        </div>

        {/* Resumo Quantitativo dos Testes (Compacto e Neutro) */}
        <div className="flex items-center flex-wrap gap-4 sm:gap-6 px-5 py-2.5 border-b bg-slate-50/60 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progresso:</span>
            <span className="text-sm font-bold text-slate-900">{resumo.pct}%</span>
            <span className="text-[11px] text-slate-400">({resumo.total - resumo.pendentes}/{resumo.total})</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aprovados:</span>
            <span className="text-sm font-bold text-emerald-700">{resumo.ok}</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Divergências:</span>
            <span className="text-sm font-bold text-amber-700">{resumo.divergencias}</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pendentes:</span>
            <span className="text-sm font-bold text-slate-700">{resumo.pendentes}</span>
          </div>
        </div>

        {/* Barra de Abas Segmentada: Roxo no ativo e Cinza no inativo */}
        <div className="px-5 pt-3 pb-2 border-b bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAbaAtiva('TESTES')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                abaAtiva === 'TESTES'
                  ? 'text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{
                background: abaAtiva === 'TESTES' ? 'var(--gradient-brand-purple)' : 'transparent',
              }}
            >
              Testes Executados
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('OBSERVACOES')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'OBSERVACOES'
                  ? 'text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{
                background: abaAtiva === 'OBSERVACOES' ? 'var(--gradient-brand-purple)' : 'transparent',
              }}
            >
              <span className={abaAtiva === 'OBSERVACOES' ? 'opacity-100' : 'opacity-70'}>💬</span>
              <span>Observações ({totalObservacoes})</span>
            </button>
          </div>

          {/* Filtros de Status (ativos apenas na aba de testes) */}
          {abaAtiva === 'TESTES' && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  filtroStatus === 'todos'
                    ? 'bg-purple-100 text-[var(--color-primary)] font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('divergencias')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  filtroStatus === 'divergencias'
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Divergências
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('ok')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  filtroStatus === 'ok'
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
          {isLoading ? (
            <div className="py-12">
              <LoadingTela mensagem="Carregando relatório de testes…" />
            </div>
          ) : abaAtiva === 'OBSERVACOES' ? (
            /* Visualização Completa de Observações: Funcionais + Gerais */
            <div className="space-y-6 max-w-4xl mx-auto">
              {totalObservacoes === 0 ? (
                <div className="py-14 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl opacity-50">💬</span>
                  <p className="text-xs font-medium text-slate-600">
                    Nenhuma observação registrada para este dispositivo até o momento.
                  </p>
                </div>
              ) : (
                <>
                  {/* Anotações por Funcionalidade (conforme Imagem de Referência) */}
                  {anotacoesFuncionalidade.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Anotações por funcionalidade ({anotacoesFuncionalidade.length})
                      </div>
                      <div className="space-y-3">
                        {anotacoesFuncionalidade.map((a) => (
                          <div
                            key={a.id}
                            className="p-4 rounded-xl border bg-white shadow-2xs space-y-2.5"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-bold text-sm text-slate-900 leading-snug">
                                {a.itemNome}
                              </h4>
                              <BadgeStatusItem status={a.status} />
                            </div>

                            {a.texto && (
                              <p className="text-slate-700 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                                {a.texto}
                              </p>
                            )}

                            {/* Anexos da funcionalidade */}
                            {a.anexos && a.anexos.length > 0 && (
                              <div className="pt-2 border-t mt-2 flex flex-wrap gap-2">
                                {a.anexos.map((anexo, i) => {
                                  const ehImagem = anexo.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(anexo.nome)
                                  if (ehImagem) {
                                    return (
                                      <div
                                        key={`${anexo.url}-${i}`}
                                        onClick={() => setImagemAmpliada({ url: anexo.url, nome: anexo.nome })}
                                        className="group relative flex flex-col items-center rounded-lg border overflow-hidden bg-slate-50 cursor-pointer hover:border-purple-400 transition-all"
                                        style={{ width: '90px' }}
                                      >
                                        <img src={anexo.url} alt={anexo.nome} className="h-16 w-full object-cover" />
                                        <span className="w-full truncate px-1 py-0.5 text-[9px] text-center font-medium bg-white text-slate-700">
                                          {anexo.nome}
                                        </span>
                                        <span className="absolute top-1 right-1 bg-black/60 text-white rounded px-1 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                                          Ampliar
                                        </span>
                                      </div>
                                    )
                                  }
                                  return (
                                    <a
                                      key={`${anexo.url}-${i}`}
                                      href={anexo.url}
                                      download={anexo.nome}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                                      title={`Baixar anexo: ${anexo.nome}`}
                                    >
                                      <span className="text-sm">📦</span>
                                      <div className="min-w-0">
                                        <p className="max-w-[140px] truncate leading-tight">{anexo.nome}</p>
                                        {anexo.tamanho && (
                                          <p className="text-[10px] text-slate-400 font-normal leading-none mt-0.5">
                                            {formatarTamanhoArquivo(anexo.tamanho)}
                                          </p>
                                        )}
                                      </div>
                                      <Icone nome="baixar" className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                    </a>
                                  )
                                })}
                              </div>
                            )}

                            <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-500 font-medium" style={{ borderColor: 'var(--color-border)' }}>
                              <span>
                                Registrado por: <strong className="text-slate-700">{a.autorEmail}</strong>
                              </span>
                              {a.atualizadoEm && (
                                <span>
                                  {new Date(a.atualizadoEm).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(a.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações Gerais */}
                  {observacoesGerais.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Observações gerais ({observacoesGerais.length})
                      </div>
                      <div className="space-y-3">
                        {observacoesGerais.map((obs) => (
                          <div
                            key={obs.id}
                            className="p-4 rounded-xl border bg-white shadow-2xs space-y-2.5"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className="font-bold text-sm text-slate-900">{obs.titulo}</span>
                              {(obs.autorEmail || obs.autorNome) && (
                                <span className="text-[10.5px] text-slate-500 font-medium">
                                  Por <strong className="text-slate-700">{obs.autorEmail || obs.autorNome}</strong>
                                  {obs.data || obs.criadoEm
                                    ? ` em ${new Date(obs.data || obs.criadoEm!).toLocaleDateString('pt-BR')} às ${new Date(obs.data || obs.criadoEm!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                    : ''}
                                </span>
                              )}
                            </div>
                            {obs.texto && (
                              <p className="text-slate-700 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                                {obs.texto}
                              </p>
                            )}

                            {/* Anexos das Observações Gerais */}
                            {obs.anexos && obs.anexos.length > 0 && (
                              <div className="pt-2 border-t mt-2 flex flex-wrap gap-2">
                                {obs.anexos.map((anexo: any, i: number) => {
                                  const ehImagem = anexo.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(anexo.nome)
                                  if (ehImagem) {
                                    return (
                                      <div
                                        key={`${anexo.url}-${i}`}
                                        onClick={() => setImagemAmpliada({ url: anexo.url, nome: anexo.nome })}
                                        className="group relative flex flex-col items-center rounded-lg border overflow-hidden bg-slate-50 cursor-pointer hover:border-purple-400 transition-all"
                                        style={{ width: '90px' }}
                                      >
                                        <img src={anexo.url} alt={anexo.nome} className="h-16 w-full object-cover" />
                                        <span className="w-full truncate px-1 py-0.5 text-[9px] text-center font-medium bg-white text-slate-700">
                                          {anexo.nome}
                                        </span>
                                        <span className="absolute top-1 right-1 bg-black/60 text-white rounded px-1 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                                          Ampliar
                                        </span>
                                      </div>
                                    )
                                  }
                                  return (
                                    <a
                                      key={`${anexo.url}-${i}`}
                                      href={anexo.url}
                                      download={anexo.nome}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                                      title={`Baixar anexo: ${anexo.nome}`}
                                    >
                                      <span className="text-sm">📦</span>
                                      <div className="min-w-0">
                                        <p className="max-w-[140px] truncate leading-tight">{anexo.nome}</p>
                                        {anexo.tamanho && (
                                          <p className="text-[10px] text-slate-400 font-normal leading-none mt-0.5">
                                            {formatarTamanhoArquivo(anexo.tamanho)}
                                          </p>
                                        )}
                                      </div>
                                      <Icone nome="baixar" className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                    </a>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Layout Cards de Grupos com Tabela de Testes Executados */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {grupos.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 italic">
                  Nenhum item encontrado.
                </div>
              ) : (
                grupos.map(([grupoKey, itensGrupo]) => (
                  <div key={grupoKey} className="rounded-xl border overflow-hidden bg-white shadow-sm flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
                    <div 
                      className="border-b px-3 py-2.5 font-bold text-xs tracking-wider uppercase text-center text-white" 
                      style={{ background: 'var(--color-primary, #7e2065)', color: '#ffffff' }}
                    >
                      {grupoKey === 'OUTROS' ? 'Outros' : (obterRotuloGrupo(grupoKey) || obterRotuloGrupoCurto(grupoKey))}
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="border-b border-slate-300 bg-slate-200">
                        <tr>
                          <th className="py-2 px-3 font-bold text-slate-700 text-[11px] tracking-wider uppercase w-full">
                            {grupoKey === 'OUTROS' ? 'Item de Teste' : obterColunasGrupo(grupoKey)[0]}
                          </th>
                          <th className="py-2 px-3 font-bold text-slate-700 text-[11px] tracking-wider uppercase text-right whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itensGrupo.map((res: any) => {
                          const obsParsed = res.observacao ? parseObservacaoItem(res.observacao) : null

                          return (
                            <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 align-top min-w-0">
                                <span className="font-semibold text-slate-800 break-words block mb-1 leading-tight">
                                  {res.item?.nome ?? 'Item'}
                                </span>
                                
                                {(res.justificativa || res.justificativaTexto) && (
                                  <div className="mt-1.5 p-1.5 rounded bg-amber-50 border border-amber-100 text-[10px] text-amber-900 leading-tight">
                                    <span className="font-bold">Justificativa: </span>
                                    {res.justificativa?.texto ?? res.justificativaTexto}
                                  </div>
                                )}
                                {obsParsed && (obsParsed.texto || obsParsed.anexos.length > 0) && (
                                  <div className="mt-1 text-[10px] text-slate-600 border-l-2 border-purple-300 pl-1.5 space-y-1">
                                    {obsParsed.texto && (
                                      <div className="italic leading-tight">
                                        Obs: {obsParsed.texto}
                                      </div>
                                    )}
                                    {obsParsed.anexos.length > 0 && (
                                      <div className="flex flex-wrap gap-1 pt-0.5 not-italic">
                                        {obsParsed.anexos.map((a, i) => {
                                          const ehImg = a.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(a.nome)
                                          return (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => ehImg ? setImagemAmpliada({ url: a.url, nome: a.nome }) : window.open(a.url, '_blank')}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9.5px] font-medium text-slate-700 border border-slate-200 cursor-pointer"
                                              title={`Anexo: ${a.nome}`}
                                            >
                                              <span>{ehImg ? '📷' : '📦'}</span>
                                              <span className="max-w-[100px] truncate">{a.nome}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                                <BadgeStatusItem status={res.status} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações e Aviso Institucional */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            O parceiro e a Mobiltec têm acesso aos anexos e logs registrados.
          </p>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {d.status === 'AGUARDANDO_ANALISE' || d.status === 'EM_REVISAO' ? (
              <Link
                to="/parceiros/validar-certificados"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                style={{ background: 'var(--gradient-brand-purple)' }}
              >
                <span>Validar Certificado na Esteira</span>
                <span>→</span>
              </Link>
            ) : null}

            {(d.homologado || d.status === 'APROVADO' || d.status === 'PUBLICADO') && d.homologacaoId ? (
              <Link
                to={`/homologacoes/${d.homologacaoId}/certificado`}
                className="px-3 py-2 rounded-lg border text-xs font-semibold text-[var(--color-primary)] hover:bg-purple-50 transition-colors inline-flex items-center gap-1.5 bg-white"
              >
                <Icone nome="certificado" className="h-4 w-4" />
                <span>Visualizar Certificado Oficial</span>
              </Link>
            ) : null}

            <button
              type="button"
              onClick={aoFechar}
              className="px-5 py-2 rounded-lg border text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer shadow-sm ml-1"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox para ampliação de imagens/prints */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setImagemAmpliada(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-2 text-white text-xs font-semibold">
              <span className="truncate">{imagemAmpliada.nome}</span>
              <button
                type="button"
                onClick={() => setImagemAmpliada(null)}
                className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer ml-4"
              >
                ✕ Fechar
              </button>
            </div>
            <img
              src={imagemAmpliada.url}
              alt={imagemAmpliada.nome}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function BadgeStatusModal({ status }: { status: StatusHomologacao }) {
  const configs: Record<StatusHomologacao, { rotulo: string; bg: string; fg: string }> = {
    RASCUNHO: { rotulo: 'Em homologação', bg: '#f1f5f9', fg: '#475569' },
    AGUARDANDO_ANALISE: { rotulo: 'Em validação', bg: '#fef3c7', fg: '#b45309' },
    EM_REVISAO: { rotulo: 'Em revisão', bg: '#dbeafe', fg: '#1d4ed8' },
    APROVADO: { rotulo: 'Homologado', bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
    PUBLICADO: { rotulo: 'Homologado', bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
    REPROVADO: { rotulo: 'Reprovado', bg: '#fee2e2', fg: '#b91c1c' },
  }

  const conf = configs[status] ?? configs.RASCUNHO

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold select-none shadow-sm"
      style={{ background: conf.bg, color: conf.fg }}
    >
      {conf.rotulo}
    </span>
  )
}

function BadgeStatusItem({ status }: { status: StatusResultado }) {
  const configs: Record<StatusResultado, { rotulo: string; bg: string; fg: string }> = {
    OK: { rotulo: 'OK', bg: '#dcfce7', fg: '#15803d' },
    FALHA: { rotulo: 'Falha', bg: '#fee2e2', fg: '#b91c1c' },
    COM_RESSALVA: { rotulo: 'Com Ressalva', bg: '#fef3c7', fg: '#b45309' },
    NAO_SUPORTADO: { rotulo: 'Não Suportado', bg: '#fee2e2', fg: '#b91c1c' },
    NAO_APLICAVEL: { rotulo: 'N/A', bg: '#f1f5f9', fg: '#64748b' },
    NAO_TESTADO: { rotulo: 'Não Testado', bg: '#f1f5f9', fg: '#64748b' },
  }

  const conf = configs[status] ?? configs.NAO_TESTADO

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 select-none shadow-xs whitespace-nowrap leading-none"
      style={{ background: conf.bg, color: conf.fg, border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {conf.rotulo}
    </span>
  )
}
