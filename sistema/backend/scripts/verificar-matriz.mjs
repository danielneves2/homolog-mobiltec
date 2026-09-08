/** Verificação da matriz (planilha web). */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const navegador = await chromium.launch()
// colorScheme dark de propósito: a UI precisa continuar clara (o usuário roda
// o SO em modo escuro e a matriz ficava ilegível).
const pagina = await navegador.newPage({
  viewport: { width: 1600, height: 900 },
  colorScheme: 'dark',
})
pagina.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await pagina.goto('http://localhost:8080/login')
  await pagina.fill('#email', 'admin@mobiltec.com.br')
  await pagina.fill('#senha', 'admin123')
  await pagina.click('button[type=submit]')
  await pagina.waitForURL('http://localhost:8080/')

  await pagina.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await pagina.waitForSelector('thead th[data-modelo]', { timeout: 10000 })
  console.log('1. Matriz carregou')

  // A trilha da barra do card é quem nomeia a seção
  const cabecalho = await pagina.locator('h1').first().textContent()
  const nModelos = await pagina.locator('thead tr').first().locator('th[data-modelo]').count()
  console.log(`2. ${cabecalho} | ${nModelos} modelo(s)`)

  // A UI tem que ficar clara mesmo com o SO em modo escuro
  const fundo = await pagina.evaluate(() => getComputedStyle(document.body).backgroundColor)
  console.log(`2b. Fundo do body: ${fundo}`)
  if (fundo !== 'rgb(255, 255, 255)') erros.push(`Tema não ficou claro: ${fundo}`)

  const nCelulas = await pagina.locator('td button[data-status]').count()
  console.log(`3. Células de status: ${nCelulas}`)
  if (nCelulas === 0) erros.push('Nenhuma célula de status renderizou')

  // A faixa é o degradê roxo do botão "Entrar", com texto branco.
  //
  // Esta asserção já disse o contrário — "faixa clara, nunca roxo chapado",
  // porque 31 colunas de tinta forte cansavam a leitura. O usuário pediu o
  // roxo de volta; o que sustenta a legibilidade agora é o texto branco, e é
  // isso que o roteiro passou a medir.
  const faixa = await pagina.locator('thead th[data-modelo]').first().evaluate((th) => {
    const e = getComputedStyle(th)
    const paradas = (e.backgroundImage.match(/rgb\([^)]+\)/g) ?? []).map((c) =>
      c.match(/\d+/g).map(Number),
    )
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) => {
          const x = v / 255
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
    const maisClara = Math.max(...paradas.map(lum))
    return {
      paradas,
      corDoNome: getComputedStyle(th.querySelector('[data-nome-modelo]')).color,
      // Branco contra a parada mais clara do degradê: é o pior caso
      contraste: +((1.05) / (maisClara + 0.05)).toFixed(2),
    }
  })
  console.log(`3b. Faixa: ${JSON.stringify(faixa.paradas)} | nome ${faixa.corDoNome} | contraste ${faixa.contraste}:1`)
  if (faixa.paradas.length !== 3) erros.push('A faixa perdeu o degradê do botão')
  if (faixa.corDoNome !== 'rgb(255, 255, 255)') {
    erros.push(`Nome do modelo deveria ser branco sobre a faixa roxa: ${faixa.corDoNome}`)
  }
  if (faixa.contraste < 4.5) {
    erros.push(`Texto branco com pouco contraste sobre a faixa: ${faixa.contraste}:1`)
  }

  // A coluna da esquerda tem a mesma anatomia das de modelo: título na mesma
  // altura e um hambúrguer à direita. O subtítulo com os grupos saiu — quem
  // responde "o que esta planilha lista" agora é o menu de seções.
  const esquerda = await pagina.evaluate(() => {
    const th = document.querySelector('thead tr th')
    const modelo = document.querySelector('thead th[data-modelo]')
    const titulo = th.querySelector('span')
    const nomeModelo = modelo.querySelector('[data-nome-modelo]')
    return {
      titulo: titulo.textContent.trim(),
      textoCompleto: th.textContent.trim(),
      temMenu: !!th.querySelector('[data-menu-coluna]'),
      desalinhamento: Math.round(
        Math.abs(titulo.getBoundingClientRect().top - nomeModelo.getBoundingClientRect().top),
      ),
    }
  })
  console.log(`3c. Coluna esquerda: "${esquerda.textoCompleto}" | menu: ${esquerda.temMenu} | desalinhamento ${esquerda.desalinhamento}px`)
  if (esquerda.desalinhamento > 2) {
    erros.push(`Título da coluna ${esquerda.desalinhamento}px fora da altura dos modelos`)
  }
  if (esquerda.titulo !== 'Homologação') erros.push(`Título da coluna: "${esquerda.titulo}"`)
  if (esquerda.textoCompleto !== 'Homologação') {
    erros.push(`O subtítulo voltou à coluna da esquerda: "${esquerda.textoCompleto}"`)
  }
  if (!esquerda.temMenu) erros.push('Falta o menu de seções na coluna da esquerda')

  await pagina.screenshot({ path: `${SAIDA}/8-matriz.png` })

  // Editar uma célula: abre o seletor.
  // Este roteiro roda contra dados reais, então guarda o estado da célula
  // antes e o restaura no fim — já houve drift permanente por não fazer isso.
  const primeira = pagina.locator('td button[data-status]').first()
  const antes = await pagina.evaluate(async () => {
    const cel = document.querySelector('td button[data-status]')
    // O link do certificado saiu do cabeçalho e foi para o menu da coluna,
    // então o id da homologação vem da própria API, pelo nome do modelo
    const th = cel.closest('table').querySelectorAll('thead th[data-modelo]')[0]
    const nomeModelo = th.dataset.modelo
    const itemNome = cel.closest('tr').getAttribute('data-item')

    const t = localStorage.getItem('homolog.token')
    const m = await (
      await fetch('/api/matriz?categoriaSlug=pos', { headers: { Authorization: `Bearer ${t}` } })
    ).json()
    const item = m.itens.find((i) => i.nome === itemNome)
    const col = m.colunas.find((c) => c.homologacao.dispositivo.nomeComercial === nomeModelo)
    const homologacaoId = col.homologacao.id
    const r = col.homologacao.resultadosPorItem[item.id]
    return {
      homologacaoId,
      itemId: item.id,
      status: r?.status ?? 'NAO_TESTADO',
      observacao: r?.observacao ?? null,
      justificativaId: r?.justificativaId ?? null,
      justificativaTexto: r?.justificativaTexto ?? null,
    }
  })

  await primeira.click()
  await pagina.waitForTimeout(300)
  const menuVisivel = await pagina.locator('text=Não suportado').count()
  console.log(`4. Seletor de status abriu: ${menuVisivel > 0}`)
  await pagina.screenshot({ path: `${SAIDA}/9-matriz-seletor.png` })

  // Escolhe OK — 1º da lista, na ordem dos atalhos 1–6 — e confirma persistência
  await pagina.locator('[role=menu] button').nth(0).click()
  await pagina.waitForTimeout(2000)
  const statusDepois = await pagina.locator('td button[data-status]').first().getAttribute('data-status')
  console.log(`5. Status ${antes.status} -> ${statusDepois}`)
  if (statusDepois !== 'OK') erros.push(`Célula não salvou: ficou ${statusDepois}`)

  // Restaura o estado original da célula
  const restaurou = await pagina.evaluate(async (a) => {
    const r = await fetch(`/api/homologacoes/${a.homologacaoId}/resultados/${a.itemId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('homolog.token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: a.status,
        observacao: a.observacao,
        justificativaId: a.justificativaId,
        justificativaTexto: a.justificativaTexto,
      }),
    })
    return r.ok
  }, antes)
  console.log(`5b. Célula restaurada para ${antes.status}: ${restaurou}`)
  if (!restaurou) erros.push('Não conseguiu restaurar a célula — dado real ficou alterado')

  // Modal de cadastro
  await pagina.click('button:has-text("Novo modelo")')
  await pagina.waitForSelector('text=Identidade do modelo', { timeout: 5000 })
  console.log('6. Modal de cadastro abriu')
  await pagina.screenshot({ path: `${SAIDA}/10-novo-modelo.png` })
  await pagina.keyboard.press('Escape')
  await pagina.locator('form').first().press('Escape').catch(() => {})
  await pagina.mouse.click(10, 10)

  // Recorte de linhas: acionado pelo painel de divergências (não há seletor)
  await pagina.waitForTimeout(500)
  const linhasAntes = await pagina.locator('tbody tr').count()
  await pagina.locator('[data-painel-divergencias]').click()
  await pagina.locator('button:has-text("filtrar para resolver")').click()
  await pagina.waitForTimeout(700)
  const linhasDepois = await pagina.locator('tbody tr').count()
  console.log(`7. "Sem justificativa": ${linhasAntes} linhas -> ${linhasDepois}`)
  if (linhasDepois > linhasAntes) erros.push('O recorte de divergências aumentou as linhas')

  // A etiqueta é o único jeito de desfazer o recorte
  const etiqueta = pagina.locator('button[title="Voltar a mostrar todos os itens"]')
  console.log(`7b. Etiqueta de filtro visível: ${await etiqueta.isVisible()}`)
  if (!(await etiqueta.isVisible())) erros.push('Sem etiqueta para limpar o filtro de itens')
  await etiqueta.click()
  await pagina.waitForTimeout(600)
  const linhasVoltou = await pagina.locator('tbody tr').count()
  console.log(`7c. Após limpar: ${linhasVoltou} linhas`)
  if (linhasVoltou !== linhasAntes) erros.push('Limpar a etiqueta não restaurou as linhas')

  await pagina.screenshot({ path: `${SAIDA}/11-matriz-divergencias.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await pagina.screenshot({ path: `${SAIDA}/erro-matriz.png` }).catch(() => {})
} finally {
  await navegador.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
