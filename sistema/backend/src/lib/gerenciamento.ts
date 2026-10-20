/**
 * Gerenciamento do aparelho e o que ele habilita na bateria (D502).
 *
 * Android: Legado ou Enterprise — a bateria vale inteira.
 * iOS: BYOD (perfil MDM num aparelho pessoal) ou Supervisionado (ABM /
 * Apple Configurator). Em BYOD parte das restrições não existe no iOS, então
 * os itens marcados `somenteSupervisionado` simplesmente não entram na
 * homologação: sem resultado, não contam no progresso, nas divergências nem
 * no certificado.
 */
import type { TipoGerenciamento } from '@prisma/client'

export const GERENCIAMENTOS = [
  'ANDROID_LEGADO',
  'ANDROID_ENTERPRISE',
  'IOS_BYOD',
  'IOS_SUPERVISIONADO',
] as const satisfies readonly TipoGerenciamento[]

/** Valor livre do corpo → gerenciamento válido (padrão: Android Legado) */
export function normalizarGerenciamento(v: unknown): TipoGerenciamento {
  return (GERENCIAMENTOS as readonly string[]).includes(v as string)
    ? (v as TipoGerenciamento)
    : 'ANDROID_LEGADO'
}

/** O item entra numa homologação com este gerenciamento? */
export function itemAplicavel(
  item: { somenteSupervisionado: boolean },
  gerenciamento: TipoGerenciamento | string,
): boolean {
  return !(gerenciamento === 'IOS_BYOD' && item.somenteSupervisionado)
}
