import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHomologacao } from '@/hooks/useHomologacao'
import { Icone } from '@/componentes/Icone'
import { ErroApi } from '@/lib/api'
import { FichaUnidadeTestada, ResultadoHomologacao } from './FichaHomologacao'
import { BlocoObservacoesParceiro } from './BlocoObservacoesParceiro'
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
 * Modal unificado de Exibir Informações (D432 / D472 / D473).
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
  const { data: homologacao, isLoading, isError, error } = useHomologacao(homologacaoId)
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
              to={`/homologacoes/${homologacaoId}/certificado`}
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
              <FichaUnidadeTestada homologacao={homologacao} />
              <ResultadoHomologacao
                homologacao={homologacao}
                onAmpliarImagem={(img) => setImagemAmpliada(img)}
              />
              <BlocoObservacoesParceiro
                observacoes={homologacao.observacoes}
                onAmpliarImagem={(img) => setImagemAmpliada(img)}
              />
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
