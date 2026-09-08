import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { medirRecorte, transformDoRecorte } from '@/lib/recorteFoto'

/**
 * Foto do modelo na vitrine.
 *
 * Nem todo dispositivo tem foto — em vez de um card quebrado, o vazio vira
 * um bloco com as iniciais do modelo, que ainda identifica o aparelho.
 *
 * A foto é aproximada até o aparelho ocupar a caixa: sem isso, quem manda no
 * tamanho na tela é a margem branca de cada arquivo, e modelos vizinhos
 * apareciam em escalas diferentes sem motivo. Ver `lib/recorteFoto`.
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

  const enquadrar = useCallback(() => {
    const img = refImg.current
    if (!img?.complete || !img.naturalWidth) return
    const recorte = medirRecorte(img)
    setTransformacao(recorte ? transformDoRecorte(img, recorte) : undefined)
  }, [])

  // `onLoad` não dispara para imagem que veio do cache do navegador
  useLayoutEffect(enquadrar, [enquadrar, url])

  return (
    <div
      className={`relative w-full overflow-hidden ${semBorda ? '' : 'border-b'}`}
      style={{
        height: altura,
        background: semBorda ? 'transparent' : 'var(--color-muted)',
      }}
    >
      {url ? (
        // Posicionamento absoluto em vez de altura percentual: num contêiner
        // centralizado, `h-full`/`max-h-full` não resolvem contra a altura da
        // caixa e a foto vazava por cima do texto do card (medido: 300px numa
        // caixa de 150px). O caminho vem como `/uploads/...`, servido pelo
        // backend atrás do proxy `/api` do Vite.
        <img
          ref={refImg}
          crossOrigin="anonymous"
          src={url.startsWith('/uploads') ? `/api${url}` : url}
          alt={nome}
          loading="lazy"
          onLoad={enquadrar}
          // Dentro da pastilha do card o respiro é menor: a moldura já separa
          // a foto do fundo, e o vão sobrando lia como distância dos dados.
          className={`absolute inset-0 h-full w-full object-contain ${semBorda ? 'p-1.5' : 'p-3'}`}
          style={{ transform: transformacao }}
        />
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
