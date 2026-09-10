import { useState, useRef, useEffect } from 'react'
import { useUploadFotoDispositivo } from '@/hooks/useHomologacao'
import { Icone } from '@/componentes/Icone'
import { ErroApi } from '@/lib/api'

interface Props {
  aberto: boolean
  aoFechar: () => void
  dispositivoId: string
  homologacaoId?: string
  nomeDispositivo: string
  fotoAtualUrl?: string | null
}

const LIMITE_TAMANHO_BYTES = 8 * 1024 * 1024 // 8 MB
const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp']

export function ModalUploadFoto({
  aberto,
  aoFechar,
  dispositivoId,
  homologacaoId,
  nomeDispositivo,
  fotoAtualUrl,
}: Props) {
  const upload = useUploadFotoDispositivo(dispositivoId, homologacaoId)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [urlPreview, setUrlPreview] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const refInput = useRef<HTMLInputElement>(null)

  // Limpa o estado e revoke da URL do blob ao fechar/trocar
  useEffect(() => {
    if (!aberto) {
      setArquivo(null)
      if (urlPreview) URL.revokeObjectURL(urlPreview)
      setUrlPreview(null)
      setErro(null)
      setArrastando(false)
    }
  }, [aberto])

  // Fecha com a tecla ESC
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto && !upload.isPending) aoFechar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, upload.isPending, aoFechar])

  if (!aberto) return null

  function validarESelecionar(arquivoCandidato: File) {
    setErro(null)

    if (!TIPOS_ACEITOS.includes(arquivoCandidato.type)) {
      setErro('Formato inválido. Por favor, envie uma imagem nos formatos PNG, JPEG ou WebP.')
      return
    }

    if (arquivoCandidato.size > LIMITE_TAMANHO_BYTES) {
      const tamanhoMB = (arquivoCandidato.size / (1024 * 1024)).toFixed(1)
      setErro(`Arquivo muito grande (${tamanhoMB} MB). O limite máximo permitido é 8 MB.`)
      return
    }

    if (urlPreview) URL.revokeObjectURL(urlPreview)
    setArquivo(arquivoCandidato)
    setUrlPreview(URL.createObjectURL(arquivoCandidato))
  }

  function tratarSoltar(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const arquivos = e.dataTransfer.files
    if (arquivos && arquivos.length > 0) {
      validarESelecionar(arquivos[0])
    }
  }

  async function handleSalvar() {
    if (!arquivo) return
    setErro(null)

    try {
      await upload.mutateAsync(arquivo)
      aoFechar()
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message)
      } else {
        setErro('Ocorreu um erro ao enviar a foto para o Supabase Storage. Tente novamente.')
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Foto do Dispositivo
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
              {nomeDispositivo}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={upload.isPending}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            title="Fechar"
          >
            <Icone nome="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">
          <input
            ref={refInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) validarESelecionar(f)
              e.target.value = ''
            }}
          />

          {!urlPreview ? (
            /* Dropzone quando nenhum arquivo foi selecionado */
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={tratarSoltar}
              onClick={() => refInput.current?.click()}
              className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                arrastando
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <div
                className="grid h-14 w-14 place-items-center rounded-full border mb-3 transition-transform group-hover:scale-110"
                style={{
                  background: 'var(--color-sidebar)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <Icone
                  nome="camera"
                  className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors"
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                Arraste uma foto aqui ou{' '}
                <span className="text-primary underline-offset-2 hover:underline">
                  procure no computador
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPEG ou WebP até 8 MB
              </p>
              {fotoAtualUrl && (
                <p className="text-[11px] text-muted-foreground/80 mt-3 pt-3 border-t w-full">
                  💡 Este dispositivo já possui foto. O novo envio substituirá a imagem atual no catálogo e nos novos certificados.
                </p>
              )}
            </div>
          ) : (
            /* Preview da imagem selecionada */
            <div className="space-y-3">
              <div
                className="relative flex items-center justify-center rounded-xl border p-4 overflow-hidden"
                style={{
                  background: 'var(--color-sidebar)',
                  borderColor: 'var(--color-border)',
                  minHeight: '220px',
                  maxHeight: '260px',
                }}
              >
                <img
                  src={urlPreview}
                  alt="Pré-visualização"
                  className="max-h-52 w-auto max-w-full object-contain rounded drop-shadow-md"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="truncate max-w-[280px]">
                  <span className="font-medium text-foreground">{arquivo?.name}</span>
                  <span className="ml-2 opacity-70">
                    ({((arquivo?.size ?? 0) / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  disabled={upload.isPending}
                  onClick={() => {
                    setArquivo(null)
                    if (urlPreview) URL.revokeObjectURL(urlPreview)
                    setUrlPreview(null)
                    setErro(null)
                  }}
                  className="text-destructive hover:underline font-medium disabled:opacity-50"
                >
                  Trocar imagem
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {erro && (
            <div
              role="alert"
              className="rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2"
              style={{
                background: 'var(--color-destructive-soft)',
                color: 'var(--color-destructive-fg)',
              }}
            >
              <span className="font-bold">Aviso:</span>
              <span>{erro}</span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-end gap-2.5 border-t px-6 py-4 bg-muted/20">
          <button
            type="button"
            onClick={aoFechar}
            disabled={upload.isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!arquivo || upload.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            {upload.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Enviando para o Supabase…</span>
              </>
            ) : (
              <>
                <Icone nome="upload" className="h-4 w-4" />
                <span>Salvar foto no catálogo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
