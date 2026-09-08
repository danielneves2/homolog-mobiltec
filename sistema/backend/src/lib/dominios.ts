/**
 * Domínios corporativos oficiais da Mobiltec.
 *
 * FONTE CANÔNICA — todas as verificações de domínio devem importar deste módulo.
 * Se novos domínios forem adicionados, atualizar apenas este arquivo.
 */

export const DOMINIOS_MOBILTEC = ['mobiltec.com.br', 'mobiltec.com']

/**
 * Verifica se um e-mail pertence a um domínio oficial da Mobiltec.
 * Aceita subdomínios (ex: `corp.mobiltec.com.br`).
 */
export function ehDominioOficial(email: string): boolean {
  const dominio = email.split('@')[1]?.toLowerCase()
  if (!dominio) return false
  return DOMINIOS_MOBILTEC.some(d => dominio === d || dominio.endsWith(`.${d}`))
}
