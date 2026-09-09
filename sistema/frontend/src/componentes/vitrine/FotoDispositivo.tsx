import { useCallback, useEffect, useRef, useState } from 'react'
import { medirRecorte, transformDoRecorte } from '@/lib/recorteFoto'

/**
 * Foto do modelo na vitrine.
 *
 * Carregamento e decodificação 100% assíncronos (loading="lazy", decoding="async")
 * para garantir rolagem fluida e livre de engasgos no navegador.
 */
export function FotoDispositivo({
  url,
  nome,
  altura,
  semBorda = false,
}: {
  url: string | null
  nome: string
  altura: number
  /** Quando o próprio contêiner já desenha borda e fundo (pastilha do card) */
  semBorda?: boolean
}) {
  const refImg = useRef<HTMLImageElement>(null)
  const [transformacao, setTransformacao] = useState<string | undefined>()
  const [carregada, setCarregada] = useState(false)

  const enquadrar = useCallback(() => {
    const img = refImg.current
    if (!img?.complete || !img.naturalWidth) return
    // Usa requestAnimationFrame para desonerar a thread principal durante a rolagem
    requestAnimationFrame(() => {
      const recorte = medirRecorte(img)
      setTransformacao(recorte ? transformDoRecorte(img, recorte) : undefined)
      setCarregada(true)
    })
  }, [])

  // useEffect em vez de useLayoutEffect para não bloquear o layout/paint durante o scroll
  useEffect(() => {
    setCarregada(false)
    enquadrar()
  }, [enquadrar, url])

  return (
    <div
      className={`relative w-full overflow-hidden ${semBorda ? '' : 'border-b'}`}
      style={{
        height: altura,
        background: semBorda ? 'transparent' : 'var(--color-muted)',
      }}
    >
      {url ? (
        <>
          {/* Skeleton sutil enquanto a imagem decodifica de forma assíncrona */}
          {!carregada && (
            <div className="absolute inset-0 bg-muted/40 animate-pulse pointer-events-none" />
          )}

          <img
            ref={refImg}
            crossOrigin="anonymous"
            src={url.startsWith('/uploads') ? `/api${url}` : url}
            alt={nome}
            loading="lazy"
            decoding="async"
            onLoad={enquadrar}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
              carregada ? 'opacity-100' : 'opacity-0'
            } ${semBorda ? 'p-1.5' : 'p-3'}`}
            style={{ transform: transformacao }}
          />
        </>
      ) : (
        <span
          className="absolute inset-0 grid place-items-center text-2xl font-semibold"
          style={{ color: 'var(--color-muted-foreground)', opacity: 0.5 }}
        >
          {iniciais(nome)}
        </span>
      )}
    </div>
  )
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
