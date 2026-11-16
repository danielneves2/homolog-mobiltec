import { useEffect, useState } from 'react'

/**
 * Tema claro/escuro (D523).
 *
 * É escolha do usuário, nunca herdada do sistema operacional: as telas de
 * grade (matriz) foram desenhadas para leitura clara, e quem trabalha nelas o
 * dia inteiro decide. A preferência fica no navegador; o `index.html` aplica
 * a classe antes do React montar, para a tela não piscar branca.
 */
export type Tema = 'claro' | 'escuro'

const CHAVE = 'homolog.tema'

export function temaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro'
  } catch {
    return 'claro'
  }
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement
  // Sem transição durante a troca: cada componente animaria a cor no seu
  // próprio ritmo e a tela "escorreria" de um tema para o outro
  raiz.classList.add('trocando-tema')
  raiz.classList.toggle('dark', tema === 'escuro')
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('trocando-tema')))
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  useEffect(() => {
    aplicar(tema)
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      /* navegador sem storage: vale só nesta aba */
    }
  }, [tema])

  return { tema, alternar: () => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro')) }
}
