import { useState } from 'react'
import { Icone } from '@/componentes/Icone'
import type { ItemObservacaoGeral } from '@/lib/tipos'
import { parseObservacaoItem } from '@/lib/observacoes'

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
 * As Observações Gerais registradas durante a homologação (D421), em leitura.
 */
export function BlocoObservacoesParceiro({
  observacoes,
  onAmpliarImagem,
}: {
  observacoes: string | null
  onAmpliarImagem?: (img: { url: string; nome: string }) => void
}) {
  const [ampliadaLocal, setAmpliadaLocal] = useState<{ url: string; nome: string } | null>(null)
  const lista = parseObservacoes(observacoes)

  function ampliar(img: { url: string; nome: string }) {
    if (onAmpliarImagem) {
      onAmpliarImagem(img)
    } else {
      setAmpliadaLocal(img)
    }
  }

  return (
    <section className="mt-6">
      <h2 className="label-caps mb-3">Observações e anexos do parceiro</h2>

      {lista.length === 0 ? (
        <div
          className="p-8 text-center rounded-lg border flex flex-col items-center justify-center text-muted-foreground"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <Icone nome="anexo" className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Nenhuma observação registrada pelo parceiro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((obs) => (
            <div
              key={obs.id}
              className="p-4 rounded-lg border space-y-2.5"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  {obs.titulo}
                </h4>
                <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {obs.autorNome && `${obs.autorNome} · `}
                  {formatarDataHora(obs.criadoEm)}
                </span>
              </div>

              {obs.texto && (
                <p
                  className="text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {obs.texto}
                </p>
              )}

              {obs.anexos && obs.anexos.length > 0 && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                    Anexos ({obs.anexos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {obs.anexos.map((a, idx) => {
                      const ehImagem = a.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(a.nome)
                      if (ehImagem) {
                        return (
                          <div
                            key={`${a.url}-${idx}`}
                            className="group relative flex flex-col items-center rounded-lg border overflow-hidden bg-muted/40 transition-all"
                            style={{ width: '110px' }}
                          >
                            <div
                              onClick={() => ampliar({ url: a.url, nome: a.nome })}
                              className="h-20 w-full cursor-pointer overflow-hidden relative bg-slate-100"
                            >
                              <img src={a.url} alt={a.nome} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                              <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                🔍 Ampliar
                              </span>
                            </div>
                            <div className="w-full flex items-center justify-between px-1.5 py-1 bg-popover text-[9px] border-t">
                              <span className="truncate max-w-[70px] font-medium" title={a.nome}>{a.nome}</span>
                              <button
                                type="button"
                                onClick={() => baixarArquivo(a.url, a.nome)}
                                className="text-primary hover:opacity-80 p-0.5 cursor-pointer"
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
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold bg-muted/30 hover:bg-muted transition-colors shadow-2xs"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <span className="text-sm">📦</span>
                          <div className="min-w-0 text-left">
                            <p className="truncate max-w-[140px] font-medium leading-tight">
                              {a.nome}
                            </p>
                            {a.tamanho && (
                              <p className="text-[9px] text-muted-foreground">
                                {formatarTamanho(a.tamanho)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => baixarArquivo(a.url, a.nome)}
                            className="ml-1 text-primary hover:opacity-80 p-0.5 cursor-pointer"
                            title={`Baixar ${a.nome}`}
                          >
                            <Icone nome="baixar" className="h-3 w-3 shrink-0" />
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
      )}

      {ampliadaLocal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
          onClick={() => setAmpliadaLocal(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white text-xs">
              <span className="font-semibold truncate max-w-md">{ampliadaLocal.nome}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => baixarArquivo(ampliadaLocal.url, ampliadaLocal.nome)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Icone nome="baixar" className="h-3.5 w-3.5" />
                  <span>Baixar imagem</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAmpliadaLocal(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
            <img
              src={ampliadaLocal.url}
              alt={ampliadaLocal.nome}
              className="max-h-[80vh] max-w-full object-contain rounded-xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  )
}

function parseObservacoes(raw?: string | null): ItemObservacaoGeral[] {
  if (!raw || !raw.trim()) return []
  const trimmed = raw.trim()

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed as ItemObservacaoGeral[]
    if (typeof parsed === 'object' && parsed !== null) return [parsed as ItemObservacaoGeral]
  } catch {
    // fallback
  }

  const parsedItem = parseObservacaoItem(trimmed)
  return [
    {
      id: 'geral-1',
      titulo: 'Observação Geral',
      texto: parsedItem.texto || trimmed,
      autorNome: 'Parceiro',
      criadoEm: new Date().toISOString(),
      anexos: parsedItem.anexos,
    },
  ]
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
