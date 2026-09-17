import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { useHomologacao } from '@/hooks/useHomologacao'
import { Icone } from '@/componentes/Icone'
import { ErroApi } from '@/lib/api'
import { META_STATUS } from '@/lib/tipos'
import { parseObservacaoItem, formatarTamanhoArquivo } from '@/lib/observacoes'
import { FichaUnidadeTestada, ResultadoHomologacao } from './FichaHomologacao'
import { AvisoRevisao } from './AvisoRevisao'

export interface ItemObservacaoProcessada {
  id: string
  titulo: string
  texto: string
  autorNome?: string
  autorEmail?: string
  data?: string
  criadoEm?: string
  anexos?: any[]
}

/**
 * Função utilitária para parsing seguro de observações gerais.
 */
export function parseObservacoes(raw?: string | null): ItemObservacaoProcessada[] {
  if (!raw || !raw.trim()) return []
  const trimmed = raw.trim()

  try {
    const parsed = JSON.parse(trimmed)
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
    // fallback
  }

  return [
    {
      id: '1',
      titulo: 'Observação Geral',
      texto: trimmed,
      anexos: [],
    },
  ]
}

/**
 * Função utilitária para download confiável de arquivos/prints pelo admin/técnico.
 */
async function baixarArquivo(url: string, nomeArquivo: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = nomeArquivo || 'anexo'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  } catch {
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo || 'anexo'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }
}

/**
 * Modal unificado de Exibir Informações (D432 / D472 / D473 / D474).
 *
 * Utilizado com o mesmo padrão visual e estrutural em:
 * 1. Validar Certificado → Exibir informações
 * 2. Painel do Parceiro → Exibir informações
 */
export function ModalInformacoesHomologacao({
  homologacaoId,
  aoFechar,
}: {
  homologacaoId: string
  aoFechar: () => void
  dispositivo?: any
}) {
  const { ehParceiro } = useAuth()
  const { data: homologacao, isLoading, isError, error } = useHomologacao(homologacaoId)
  const [abaAtiva, setAbaAtiva] = useState<'MATRIZ' | 'OBSERVACOES'>('MATRIZ')
  const [imagemAmpliada, setImagemAmpliada] = useState<{ url: string; nome: string } | null>(null)

  // Esc fecha: o modal cobre a tela inteira e o usuário percorre pelo teclado
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (imagemAmpliada) {
          setImagemAmpliada(null)
        } else {
          aoFechar()
        }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, imagemAmpliada])

  const titulo = homologacao?.dispositivo
    ? `${homologacao.dispositivo.fabricante} ${homologacao.dispositivo.modelo}`
    : 'Informações da homologação'

  const subtitulo = homologacao?.dispositivo?.nomeComercial || null

  const revisao =
    homologacao?.status === 'EM_REVISAO'
      ? homologacao.historicoStatus?.find((h) => h.statusNovo === 'EM_REVISAO')
      : undefined

  // Anotações funcionais registradas em itens de teste
  const anotacoesFuncionalidade = useMemo(() => {
    if (!homologacao?.resultados) return []
    return homologacao.resultados
      .map((r) => {
        const obsParsed = r.observacao ? parseObservacaoItem(r.observacao) : null
        const justParsed = r.justificativaTexto ? parseObservacaoItem(r.justificativaTexto) : null
        const justObj = r.justificativa?.texto ? parseObservacaoItem(r.justificativa.texto) : null

        const obsTexto = obsParsed?.texto?.trim() || null
        const justTexto =
          justParsed?.texto?.trim() ||
          justObj?.texto?.trim() ||
          (r.justificativaTexto?.trim() ?? r.justificativa?.texto?.trim() ?? null)

        const todosAnexos = [
          ...(obsParsed?.anexos ?? []),
          ...(justParsed?.anexos ?? []),
          ...(justObj?.anexos ?? []),
        ].filter((a, idx, arr) => arr.findIndex((x) => x.url === a.url) === idx)

        return {
          id: r.id,
          itemNome: r.item?.nome ?? 'Funcionalidade',
          status: r.status,
          grupo: r.item?.grupo,
          acao: r.item?.descricaoAcao,
          texto: obsTexto,
          justificativa: justTexto,
          anexos: todosAnexos,
          autorIdentificacao:
            (r as any).autorEmail ||
            (homologacao as any)?.responsavel?.email ||
            homologacao?.responsavel?.nome ||
            null,
          atualizadoEm: (r as any).atualizadoEm || homologacao?.atualizadoEm || homologacao?.criadoEm,
        }
      })
      .filter((item) => Boolean(item.texto || item.justificativa || (item.anexos && item.anexos.length > 0)))
  }, [homologacao])

  // Observações gerais da homologação
  const observacoesGerais = useMemo(() => {
    return parseObservacoes(homologacao?.observacoes)
  }, [homologacao?.observacoes])

  const totalObservacoes = anotacoesFuncionalidade.length + observacoesGerais.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.55)', backdropFilter: 'blur(2px)' }}
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-popover, #ffffff)', borderColor: 'var(--color-border)' }}
      >
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold truncate" style={{ color: 'var(--color-foreground)' }}>
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {subtitulo}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/homologacoes/${homologacaoId}/certificado?ambiente=${ehParceiro ? 'parceiro' : 'mobiltec'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <Icone nome="certificado" className="h-3.5 w-3.5" />
              Certificado
            </Link>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar informações"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Carregando informações…
            </p>
          ) : isError || !homologacao ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--color-destructive)' }}>
              {error instanceof ErroApi
                ? error.message
                : 'Não foi possível carregar as informações desta homologação.'}
            </p>
          ) : (
            <>
              {revisao && (
                <div className="mb-5">
                  <AvisoRevisao
                    motivo={revisao.motivo}
                    solicitadoEm={revisao.criadoEm}
                    solicitadoPor={revisao.usuario?.nome}
                  />
                </div>
              )}

              {/* Ficha da Unidade Testada (sempre visível no topo) */}
              <FichaUnidadeTestada homologacao={homologacao} />

              {/* Barra de Abas ao lado do título Resultado da homologação (D474) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                <h2 className="label-caps m-0 font-bold" style={{ color: 'var(--color-foreground)' }}>
                  Resultado da homologação
                </h2>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('MATRIZ')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      abaAtiva === 'MATRIZ'
                        ? 'text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    style={abaAtiva === 'MATRIZ' ? { background: 'var(--gradient-brand-purple)' } : {}}
                  >
                    Matriz de Testes
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('OBSERVACOES')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      abaAtiva === 'OBSERVACOES'
                        ? 'text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    style={abaAtiva === 'OBSERVACOES' ? { background: 'var(--gradient-brand-purple)' } : {}}
                  >
                    <span>💬 Observações</span>
                    {totalObservacoes > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          abaAtiva === 'OBSERVACOES' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {totalObservacoes}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Visualização da Matriz de Testes (Limpa e Estritamente Tabular) */}
              {abaAtiva === 'MATRIZ' && (
                <ResultadoHomologacao
                  homologacao={homologacao}
                  semTitulo={true}
                />
              )}

              {/* Visualização de Observações Separadas (Funcionalidades + Gerais) */}
              {abaAtiva === 'OBSERVACOES' && (
                <div className="space-y-6 pt-1">
                  {totalObservacoes === 0 ? (
                    <div
                      className="p-10 text-center rounded-xl border flex flex-col items-center justify-center text-muted-foreground bg-muted/20"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Icone nome="anexo" className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">
                        Nenhuma observação ou anexo registrado para esta homologação.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Seção 1: Observações por Funcionalidade */}
                      {anotacoesFuncionalidade.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Observações por funcionalidade ({anotacoesFuncionalidade.length})
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {anotacoesFuncionalidade.map((item) => (
                              <div
                                key={item.id}
                                className="p-4 rounded-xl border shadow-2xs space-y-3"
                                style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
                              >
                                <div className="flex items-center justify-between gap-2 border-b pb-2">
                                  <div>
                                    <h4 className="font-bold text-sm text-foreground leading-snug">
                                      {item.itemNome}
                                    </h4>
                                    {item.acao && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.acao}</p>
                                    )}
                                  </div>
                                  <span
                                    className="inline-block rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-2xs shrink-0"
                                    style={{
                                      background: META_STATUS[item.status].corFill,
                                      color: META_STATUS[item.status].cor,
                                      border: '1px solid rgba(0,0,0,0.06)',
                                    }}
                                  >
                                    {META_STATUS[item.status].rotulo}
                                  </span>
                                </div>

                                {/* Texto da Observação */}
                                {item.texto && (
                                  <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200/80 text-xs sm:text-[13px] text-purple-950 leading-relaxed shadow-2xs">
                                    <span className="font-bold text-purple-900">Observação: </span>
                                    <span className="whitespace-pre-wrap">{item.texto}</span>
                                  </div>
                                )}

                                {/* Texto da Justificativa */}
                                {item.justificativa && (
                                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs sm:text-[13px] text-amber-950 leading-relaxed shadow-2xs">
                                    <span className="font-bold text-amber-900">Justificativa: </span>
                                    <span className="whitespace-pre-wrap">{item.justificativa}</span>
                                  </div>
                                )}

                                {/* Anexos da Funcionalidade */}
                                {item.anexos && item.anexos.length > 0 && (
                                  <div className="pt-2 border-t mt-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                                      Anexos ({item.anexos.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {item.anexos.map((a, idx) => {
                                        const ehImagem = a.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(a.nome)
                                        if (ehImagem) {
                                          return (
                                            <div
                                              key={`${a.url}-${idx}`}
                                              className="group relative flex flex-col items-center rounded-lg border overflow-hidden bg-slate-50 transition-all shadow-2xs"
                                              style={{ width: '110px' }}
                                            >
                                              <div
                                                onClick={() => setImagemAmpliada({ url: a.url, nome: a.nome })}
                                                className="h-20 w-full cursor-pointer overflow-hidden relative bg-slate-100"
                                              >
                                                <img
                                                  src={a.url}
                                                  alt={a.nome}
                                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                  🔍 Ampliar
                                                </span>
                                              </div>
                                              <div className="w-full flex items-center justify-between px-2 py-1 bg-white text-[9px] border-t">
                                                <span className="truncate max-w-[70px] font-medium" title={a.nome}>
                                                  {a.nome}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => baixarArquivo(a.url, a.nome)}
                                                  className="text-purple-700 hover:text-purple-900 p-0.5 cursor-pointer"
                                                  title="Baixar imagem"
                                                >
                                                  <Icone nome="baixar" className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        }
                                        return (
                                          <div
                                            key={`${a.url}-${idx}`}
                                            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 transition-colors shadow-2xs"
                                            style={{ borderColor: 'var(--color-border)' }}
                                          >
                                            <span className="text-sm">📦</span>
                                            <div className="min-w-0 text-left">
                                              <p className="truncate max-w-[140px] font-medium leading-tight text-slate-800">
                                                {a.nome}
                                              </p>
                                              {a.tamanho && (
                                                <p className="text-[9px] text-slate-500">
                                                  {formatarTamanhoArquivo(a.tamanho)}
                                                </p>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => baixarArquivo(a.url, a.nome)}
                                              className="ml-1 text-purple-700 hover:text-purple-900 p-1 cursor-pointer rounded hover:bg-purple-100 transition-colors"
                                              title={`Baixar ${a.nome}`}
                                            >
                                              <Icone nome="baixar" className="h-3.5 w-3.5 shrink-0" />
                                            </button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Rodapé da observação funcional */}
                                {(item.autorIdentificacao || item.atualizadoEm) && (
                                  <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                                    {item.autorIdentificacao ? (
                                      <span>
                                        Registrado por: <strong className="text-foreground">{item.autorIdentificacao}</strong>
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    {item.atualizadoEm && (
                                      <span>
                                        {new Date(item.atualizadoEm).toLocaleDateString('pt-BR')} às{' '}
                                        {new Date(item.atualizadoEm).toLocaleTimeString('pt-BR', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Seção 2: Observações Gerais */}
                      {observacoesGerais.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Observações gerais ({observacoesGerais.length})
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {observacoesGerais.map((obs) => (
                              <div
                                key={obs.id}
                                className="p-4 rounded-xl border shadow-2xs space-y-3"
                                style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
                              >
                                <div className="flex items-center justify-between gap-2 border-b pb-2">
                                  <span className="font-bold text-sm text-foreground">{obs.titulo}</span>
                                  {(obs.autorEmail || obs.autorNome) && (
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      Por <strong className="text-foreground">{obs.autorEmail || obs.autorNome}</strong>
                                      {obs.data || obs.criadoEm
                                        ? ` em ${new Date(obs.data || obs.criadoEm!).toLocaleDateString('pt-BR')} às ${new Date(obs.data || obs.criadoEm!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                        : ''}
                                    </span>
                                  )}
                                </div>

                                {obs.texto && (
                                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
                                    {obs.texto}
                                  </p>
                                )}

                                {/* Anexos gerais */}
                                {obs.anexos && obs.anexos.length > 0 && (
                                  <div className="pt-2 border-t mt-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                                      Anexos ({obs.anexos.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {obs.anexos.map((a, idx) => {
                                        const ehImagem = a.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(a.nome)
                                        if (ehImagem) {
                                          return (
                                            <div
                                              key={`${a.url}-${idx}`}
                                              className="group relative flex flex-col items-center rounded-lg border overflow-hidden bg-slate-50 transition-all shadow-2xs"
                                              style={{ width: '110px' }}
                                            >
                                              <div
                                                onClick={() => setImagemAmpliada({ url: a.url, nome: a.nome })}
                                                className="h-20 w-full cursor-pointer overflow-hidden relative bg-slate-100"
                                              >
                                                <img
                                                  src={a.url}
                                                  alt={a.nome}
                                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                  🔍 Ampliar
                                                </span>
                                              </div>
                                              <div className="w-full flex items-center justify-between px-2 py-1 bg-white text-[9px] border-t">
                                                <span className="truncate max-w-[70px] font-medium" title={a.nome}>
                                                  {a.nome}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => baixarArquivo(a.url, a.nome)}
                                                  className="text-purple-700 hover:text-purple-900 p-0.5 cursor-pointer"
                                                  title="Baixar imagem"
                                                >
                                                  <Icone nome="baixar" className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          )
                                        }
                                        return (
                                          <div
                                            key={`${a.url}-${idx}`}
                                            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 transition-colors shadow-2xs"
                                            style={{ borderColor: 'var(--color-border)' }}
                                          >
                                            <span className="text-sm">📦</span>
                                            <div className="min-w-0 text-left">
                                              <p className="truncate max-w-[140px] font-medium leading-tight text-slate-800">
                                                {a.nome}
                                              </p>
                                              {a.tamanho && (
                                                <p className="text-[9px] text-slate-500">
                                                  {formatarTamanhoArquivo(a.tamanho)}
                                                </p>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => baixarArquivo(a.url, a.nome)}
                                              className="ml-1 text-purple-700 hover:text-purple-900 p-1 cursor-pointer rounded hover:bg-purple-100 transition-colors"
                                              title={`Baixar ${a.nome}`}
                                            >
                                              <Icone nome="baixar" className="h-3.5 w-3.5 shrink-0" />
                                            </button>
                                          </div>
                                        )
                                      })}
                                    </div>
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox para ampliação de imagens/prints */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setImagemAmpliada(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 text-white text-xs font-semibold">
              <span className="truncate max-w-md">{imagemAmpliada.nome}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => baixarArquivo(imagemAmpliada.url, imagemAmpliada.nome)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Icone nome="baixar" className="h-3.5 w-3.5" />
                  <span>Baixar imagem</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImagemAmpliada(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
            <img
              src={imagemAmpliada.url}
              alt={imagemAmpliada.nome}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
