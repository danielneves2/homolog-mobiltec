import { useState, useRef, useEffect } from 'react'
import { useUploadDatasheetDispositivo } from '@/hooks/useHomologacao'
import { Icone } from '@/componentes/Icone'
import { ErroApi } from '@/lib/api'

interface Props {
  aberto: boolean
  aoFechar: () => void
  dispositivoId: string
  homologacaoId?: string
  nomeDispositivo: string
  datasheetAtualUrl?: string | null
  aoSucesso?: () => void
}

const LIMITE_TAMANHO_BYTES = 15 * 1024 * 1024 // 15 MB

export function ModalUploadDatasheet({
  aberto,
  aoFechar,
  dispositivoId,
  homologacaoId,
  nomeDispositivo,
  datasheetAtualUrl,
  aoSucesso,
}: Props) {
  const upload = useUploadDatasheetDispositivo(dispositivoId, homologacaoId)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const refInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) {
      setArquivo(null)
      setErro(null)
      setArrastando(false)
    }
  }, [aberto])

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

    const ehPdf =
      arquivoCandidato.type === 'application/pdf' ||
      arquivoCandidato.name.toLowerCase().endsWith('.pdf')

    if (!ehPdf) {
      setErro('Formato inválido. O datasheet deve ser exclusivamente um arquivo PDF.')
      return
    }

    if (arquivoCandidato.size > LIMITE_TAMANHO_BYTES) {
      const tamanhoMB = (arquivoCandidato.size / (1024 * 1024)).toFixed(1)
      setErro(`Arquivo muito grande (${tamanhoMB} MB). O limite máximo permitido é 15 MB.`)
      return
    }

    setArquivo(arquivoCandidato)
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
      aoSucesso?.()
      aoFechar()
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message)
      } else {
        setErro('Ocorreu um erro ao enviar o datasheet. Tente novamente.')
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-datasheet"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 15, 18, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !upload.isPending) aoFechar()
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: 'var(--color-card, #ffffff)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="titulo-modal-datasheet"
              className="text-base font-semibold text-foreground"
            >
              {datasheetAtualUrl ? 'Alterar Datasheet' : 'Anexar Datasheet Oficial'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Dispositivo:{' '}
              <strong className="text-foreground font-medium">{nomeDispositivo}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={upload.isPending}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            aria-label="Fechar"
          >
            <Icone nome="x" className="h-5 w-5" />
          </button>
        </div>

        {erro && (
          <div
            role="alert"
            className="mt-4 rounded-lg border p-3 text-xs leading-relaxed"
            style={{
              background: 'var(--color-destructive-soft, #fdf2f2)',
              borderColor: 'var(--color-destructive-border, #f8b4b4)',
              color: 'var(--color-destructive-fg, #9b1c1c)',
            }}
          >
            {erro}
          </div>
        )}

        <div className="mt-5">
          <input
            ref={refInput}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) validarESelecionar(f)
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={tratarSoltar}
            onClick={() => refInput.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              arrastando
                ? 'border-[var(--color-primary)] bg-[var(--color-brand-purple-soft)]'
                : 'border-border hover:border-[var(--color-primary)] hover:bg-muted/40'
            }`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xs transition-transform group-hover:scale-110"
              style={{ background: 'var(--gradient-brand-purple)' }}
            >
              <Icone nome="anexo" className="h-6 w-6" />
            </div>

            <p className="mt-3 text-sm font-semibold text-foreground">
              {arquivo
                ? arquivo.name
                : 'Clique para escolher ou arraste o arquivo PDF'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {arquivo
                ? `${(arquivo.size / (1024 * 1024)).toFixed(2)} MB — Pronto para salvar`
                : 'Formato aceito: PDF (máx. 15 MB)'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={aoFechar}
            disabled={upload.isPending}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!arquivo || upload.isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-45"
            style={{ background: 'var(--gradient-brand-purple)' }}
          >
            <Icone nome="upload" className="h-4 w-4" />
            {upload.isPending ? 'Enviando PDF…' : 'Salvar Datasheet'}
          </button>
        </div>
      </div>
    </div>
  )
}
