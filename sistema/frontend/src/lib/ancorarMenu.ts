/**
 * Posiciona um menu `position: fixed` ancorado ao botão que o abriu.
 *
 * Os menus da matriz são `fixed` porque a tabela rola e tem `overflow`
 * em vários níveis — um menu `absolute` seria recortado. Só que `fixed`
 * também não é recortado pela **janela**: ancorado logo abaixo do botão,
 * um menu aberto numa célula do fim da tabela nasce metade fora da tela,
 * e as últimas opções ficam inalcançáveis.
 *
 * Daí esta função: tenta abaixo, vira para cima se não couber, e em
 * último caso encosta na borda com a folga mínima.
 */
export function ancorarMenu(
  botao: DOMRect,
  menu: { largura: number; altura: number },
  margem = 8,
  /**
   * `inicio` alinha pela esquerda do gatilho (menus), `centro` pelo meio dele,
   * `fim` pela direita — este último faz o balão crescer para a esquerda, que
   * é para onde há espaço quando o gatilho fica na borda direita de uma linha.
   */
  alinhamento: 'inicio' | 'centro' | 'fim' = 'inicio',
): { x: number; y: number } {
  const alturaJanela = window.innerHeight
  const larguraJanela = window.innerWidth

  const abaixo = botao.bottom + 4
  const acima = botao.top - 4 - menu.altura

  let y: number
  if (abaixo + menu.altura <= alturaJanela - margem) {
    y = abaixo
  } else if (acima >= margem) {
    y = acima
  } else {
    // Não cabe inteiro de nenhum lado (menu alto, janela baixa): encosta
    // embaixo. Quem tem `max-height` e rolagem própria continua usável.
    y = Math.max(margem, alturaJanela - margem - menu.altura)
  }

  const bruto =
    alinhamento === 'centro'
      ? botao.left + botao.width / 2 - menu.largura / 2
      : alinhamento === 'fim'
        ? botao.right - menu.largura
        : botao.left
  const x = Math.min(Math.max(margem, bruto), larguraJanela - menu.largura - margem)

  return { x: Math.max(margem, x), y }
}
