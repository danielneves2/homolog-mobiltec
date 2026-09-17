import { useState, useRef, useMemo } from 'react'
import { api, ErroApi } from '@/lib/api'
import { Icone } from '@/componentes/Icone'
import type { AnexoObservacao } from '@/lib/tipos'
import { parseObservacaoItem, serializarObservacaoItem, formatarTamanhoArquivo } from '@/lib/observacoes'

/**
 * Nota interna sobre um resultado (célula da matriz).
 * Permite digitar texto limpo, anexar .zip e colar prints com Ctrl+V.
 * Mantém os anexos em chips dedicados sem poluir o textarea com tags Markdown.
 */
export function ModalObservacao({
  itemNome,
  modeloNome,
  textoAtual,
  autorEmail,
  atualizadoEm,
  salvando,
  aoSalvar,
  aoFechar,
}: {
  itemNome: string
  modeloNome: string
  textoAtual: string
  autorEmail?: string | null
  atualizadoEm?: string | null
  salvando: boolean
  aoSalvar: (serializado: string) => void
  aoFechar: () => void
}) {
  const dadosIniciais = useMemo(() => parseObservacaoItem(textoAtual), [textoAtual])
  const [texto, setTexto] = useState(dadosIniciais.texto)
  const [anexos, setAnexos] = useState<AnexoObservacao[]>(dadosIniciais.anexos)
  const [fazendoUpload, setFazendoUpload] = useState(false)
  const [erroUpload, setErroUpload] = useState<string | null>(null)
  const [imagemAmpliada, setImagemAmpliada] = useState<{ url: string; nome: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processarArquivo(arquivo: File) {
    setErroUpload(null)
    const ext = arquivo.name.slice(arquivo.name.lastIndexOf('.')).toLowerCase()

    if (
      arquivo.type.startsWith('video/') ||
      ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'].includes(ext)
    ) {
      setErroUpload('Vídeos não serão permitidos neste momento.')
      return
    }

    const permitido =
      arquivo.type.startsWith('image/') ||
      ['.png', '.jpg', '.jpeg', '.webp', '.zip'].includes(ext) ||
      arquivo.type === 'application/zip' ||
      arquivo.type === 'application/x-zip-compressed'

    if (!permitido) {
      setErroUpload('Formato não suportado. Envie arquivos .zip ou imagens (PNG, JPEG, WebP).')
      return
    }

    setFazendoUpload(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      const res = await api.postMultipart<AnexoObservacao>('/upload/anexo', formData)

      // Adiciona o anexo à lista de anexos sem alterar o texto digitado
      setAnexos((prev) => [...prev, res])
    } catch (err) {
      setErroUpload(err instanceof ErroApi ? err.message : 'Falha ao enviar arquivo.')
    } finally {
      setFazendoUpload(false)
    }
  }

  function aoColar(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          processarArquivo(file)
          break
        }
      }
    }
  }

  function removerAnexo(index: number) {
    setAnexos((prev) => prev.filter((_, i) => i !== index))
  }

  function submeter() {
    aoSalvar(serializarObservacaoItem(texto, anexos))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,.45)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (imagemAmpliada) {
              setImagemAmpliada(null)
            } else {
              aoFechar()
            }
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            submeter()
          }
        }}
        className="w-full max-w-xl rounded-xl border shadow-xl"
        style={{ background: 'var(--color-popover)' }}
      >
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Observação</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              {itemNome} · {modeloNome}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Fechar"
          >
            <Icone nome="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3" onPaste={aoColar}>
          <textarea
            autoFocus
            rows={5}
            value={texto}
            placeholder="Descreva observações, comportamentos anômalos ou detalhes técnicos do teste..."
            onChange={(e) => setTexto(e.target.value)}
            className="w-full p-3 rounded-md border bg-transparent text-sm leading-relaxed resize-y outline-none focus:ring-1 focus:ring-primary"
            style={{ borderColor: 'var(--color-input)' }}
          />

          {erroUpload && (
            <div
              className="p-2 rounded-md text-xs font-medium"
              style={{ background: 'var(--color-destructive-soft)', color: 'var(--color-destructive-fg)' }}
            >
              {erroUpload}
            </div>
          )}

          {/* Anexos adicionados */}
          {anexos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Anexos ({anexos.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {anexos.map((anexo, idx) => {
                  const ehImagem = anexo.tipo === 'imagem' || /\.(png|jpe?g|webp)$/i.test(anexo.nome)
                  return (
                    <div
                      key={`${anexo.url}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs bg-muted/60"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {ehImagem ? (
                        <button
                          type="button"
                          onClick={() => setImagemAmpliada({ url: anexo.url, nome: anexo.nome })}
                          className="group relative cursor-pointer"
                          title="Ampliar print"
                        >
                          <img
                            src={anexo.url}
                            alt={anexo.nome}
                            className="h-7 w-7 rounded object-cover border"
                          />
                        </button>
                      ) : (
                        <span className="text-base font-mono">📦</span>
                      )}
                      <div className="min-w-0 max-w-[150px]">
                        <p className="truncate font-medium leading-tight text-[11.5px]" title={anexo.nome}>
                          {anexo.nome}
                        </p>
                        {anexo.tamanho && (
                          <p className="text-[10px] text-muted-foreground">
                            {formatarTamanhoArquivo(anexo.tamanho)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerAnexo(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-1 p-0.5 cursor-pointer"
                        title="Remover anexo"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) processarArquivo(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={fazendoUpload}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-foreground bg-transparent hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              style={{ borderColor: 'var(--color-input)' }}
            >
              <Icone nome="anexo" className="h-3.5 w-3.5" />
              <span>{fazendoUpload ? 'Enviando…' : 'Anexar .zip ou print'}</span>
            </button>
            <span className="text-[11px] text-muted-foreground">
              Cole imagem com <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">Ctrl+V</kbd>
            </span>
          </div>
        </div>

        {autorEmail && (
          <div className="px-5 py-2 bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-between border-t border-dashed" style={{ borderColor: 'var(--color-border)' }}>
            <span>Registrado por: <strong className="font-semibold text-foreground">{autorEmail}</strong></span>
            {atualizadoEm && (
              <span className="font-medium">
                {new Date(atualizadoEm).toLocaleDateString('pt-BR')} às{' '}
                {new Date(atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        <div className="p-5 border-t flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <kbd className="font-mono">Esc</kbd> cancela ·{' '}
            <kbd className="font-mono">Ctrl+Enter</kbd> salva
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="px-4 py-2 rounded-md text-sm cursor-pointer"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submeter}
              disabled={salvando || fazendoUpload}
              className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--gradient-brand-purple)' }}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox para ampliação de prints anexados */}
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
