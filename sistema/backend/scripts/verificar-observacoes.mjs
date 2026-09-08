/**
 * Quatro mudanças da mesma leva:
 *
 * 1. Marcar status divergente não exige mais justificativa.
 * 2. Cabeçalho da coluna: nome à esquerda, Finalizar/Reabrir na altura dele,
 *    e "Observação" no lugar que era do Finalizar.
 * 3. "Retestados" virou "Revalidados".
 * 4. A marca do produto no painel, colorida e em pastilha de vidro.
 *
 * O item 1 é testado gravando de verdade e restaurando o valor anterior.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

const api = (caminho, opcoes = {}) =>
  p.evaluate(
    async ([c, o]) => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` }
      if (o.body) headers['Content-Type'] = 'application/json'
      const r = await fetch(`/api${c}`, {
        method: o.method ?? 'GET',
        headers,
        body: o.body ? JSON.stringify(o.body) : undefined,
      })
      const t = await r.text()
      return { ok: r.ok, status: r.status, corpo: t ? JSON.parse(t) : null }
    },
    [caminho, opcoes],
  )

let restaurar = null

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  // --- 1. Status divergente sem justificativa: agora passa ---
  const matriz = await api('/matriz?categoriaSlug=pos')
  const coluna = matriz.corpo.colunas.find((c) => c.homologacao.status === 'RASCUNHO')
  const item = matriz.corpo.itens[0]
  const antes = coluna.homologacao.resultados.find((r) => r.itemId === item.id)
  restaurar = { homId: coluna.homologacao.id, itemId: item.id, antes }

  const semJust = await api(`/homologacoes/${coluna.homologacao.id}/resultados/${item.id}`, {
    method: 'PUT',
    body: { status: 'FALHA', observacao: null, justificativaId: null, justificativaTexto: null },
  })
  console.log(`1. FALHA sem justificativa: HTTP ${semJust.status}`)
  if (semJust.status !== 200) {
    erros.push(`Marcar divergência ainda exige justificativa: ${JSON.stringify(semJust.corpo)}`)
  }

  // --- 2. Observações da homologação gravam e voltam ---
  const marca = `Rascunho do roteiro ${Date.now().toString().slice(-6)}`
  const gravou = await api(`/homologacoes/${coluna.homologacao.id}`, {
    method: 'PATCH',
    body: { observacoes: marca },
  })
  const releu = await api(`/homologacoes/${coluna.homologacao.id}`)
  console.log(`2. Observações da homologação: HTTP ${gravou.status} | releu: ${releu.corpo?.observacoes === marca}`)
  if (gravou.status !== 200) erros.push(`Não gravou as observações: ${JSON.stringify(gravou.corpo)}`)
  if (releu.corpo?.observacoes !== marca) erros.push('As observações não voltaram do banco')

  // Elas não podem vazar para o certificado
  const html = await p.evaluate(async (id) => {
    const r = await fetch(`/api/homologacoes/${id}/certificado/preview`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    return r.text()
  }, coluna.homologacao.id)
  console.log(`2b. Observações no certificado: ${html.includes(marca)}`)
  if (html.includes(marca)) erros.push('O rascunho do técnico vazou para o certificado')

  // --- 3. Cabeçalho da coluna ---
  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(900)

  const cabecalho = await p.evaluate(() => {
    const th = document.querySelector('thead th[data-modelo]')
    const nome = th.querySelector('div div div')
    const menu = th.querySelector('[data-menu-coluna]')
    const r = (el) => el.getBoundingClientRect()
    return {
      // Só o hambúrguer: as ações soltas saíram do cabeçalho
      botoesSoltos: [...th.querySelectorAll('a,button')].length,
      temMenu: !!menu,
      altura: Math.round(r(th).height),
      nomeAEsquerda: Math.round(r(nome).left - r(th).left) < 14,
      menuNaLinhaDoNome:
        Math.abs(r(menu).top + r(menu).height / 2 - (r(nome).top + r(nome).height / 2)) < 10,
      menuADireita: r(menu).left > r(th).left + r(th).width / 2,
    }
  })
  console.log(`3. Cabeçalho: ${JSON.stringify(cabecalho)}`)
  if (!cabecalho.temMenu) erros.push('Falta o menu hambúrguer no cabeçalho')
  if (cabecalho.botoesSoltos > 1) {
    erros.push(`Sobraram ${cabecalho.botoesSoltos} botões soltos no cabeçalho — era para ir tudo no menu`)
  }
  if (!cabecalho.nomeAEsquerda) erros.push('O nome do modelo não está à esquerda do cabeçalho')
  if (!cabecalho.menuNaLinhaDoNome) erros.push('O menu não está na altura do nome')
  if (!cabecalho.menuADireita) erros.push('O menu deveria ficar à direita do nome')
  // Com uma linha só, a faixa não precisa da altura de antes (era ~84px)
  if (cabecalho.altura > 60) erros.push(`O cabeçalho continua alto: ${cabecalho.altura}px`)

  // As cinco ações, com Configuração na frente e Finalizar/Reabrir no fim
  await p.locator('thead th[data-modelo]').first().locator('[data-menu-coluna]').click()
  await p.waitForSelector('[data-menu-aberto]')
  const acoes = await p.locator('[data-menu-aberto] button').allTextContents()
  await p.keyboard.press('Escape')
  console.log(`3a. Ações do menu: ${JSON.stringify(acoes.map((t) => t.trim()))}`)
  const esperadas = ['Configuração', 'Certificado', 'Reteste', 'Observação']
  for (const e of esperadas) {
    if (!acoes.some((t) => t.trim() === e)) erros.push(`Falta "${e}" no menu da coluna`)
  }
  if (acoes[0]?.trim() !== 'Configuração') erros.push('"Configuração" deveria ser a primeira ação')
  if (!/Finalizar|Reabrir/.test(acoes.at(-1) ?? '')) {
    erros.push('Finalizar/Reabrir deveria ser a última ação')
  }

  // "Configuração" abre o formulário do cadastro, já preenchido
  await p.locator('thead th[data-modelo]').first().locator('[data-menu-coluna]').click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: 'Configuração' }).click()
  await p.waitForSelector('form:has(input)')
  const config = await p.evaluate(() => {
    const form = [...document.querySelectorAll('form')].find((f) => f.querySelector('h2'))
    const campos = [...form.querySelectorAll('input')].map((i) => i.value)
    return {
      titulo: form.querySelector('h2').textContent.trim(),
      preenchidos: campos.filter(Boolean).length,
      total: campos.length,
      bateriaTravada: form.querySelector('select[disabled]') !== null,
    }
  })
  console.log(`3a2. Configuração: "${config.titulo}" | ${config.preenchidos}/${config.total} campos preenchidos | bateria travada: ${config.bateriaTravada}`)
  if (!/Configuração/.test(config.titulo)) erros.push(`Modal errado: "${config.titulo}"`)
  if (config.preenchidos < 6) erros.push('A configuração abriu com os campos vazios')
  if (!config.bateriaTravada) erros.push('A bateria deveria ficar travada na configuração')
  await p.keyboard.press('Escape')
  await p.locator('button', { hasText: 'Cancelar' }).first().click()
  await p.waitForTimeout(400)

  // --- 3b. O caderno: observação geral + anotações por funcionalidade ---
  // Marca duas células com anotação para o modal ter o que listar
  const comAnotacao = matriz.corpo.itens.slice(0, 2)
  const notas = comAnotacao.map((i, n) => ({ item: i, texto: `Anotação ${n + 1} do roteiro` }))
  for (const { item: it, texto } of notas) {
    const r = coluna.homologacao.resultados.find((x) => x.itemId === it.id)
    await api(`/homologacoes/${coluna.homologacao.id}/resultados/${it.id}`, {
      method: 'PUT',
      body: {
        status: r?.status ?? 'NAO_TESTADO',
        observacao: texto,
        justificativaId: r?.justificativaId ?? null,
        justificativaTexto: r?.justificativaTexto ?? null,
      },
    })
  }
  restaurar.notas = notas.map(({ item: it }) => ({
    item: it,
    antes: coluna.homologacao.resultados.find((x) => x.itemId === it.id),
  }))

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(600)
  const alvo = p
    .locator('thead th[data-modelo]')
    .filter({ hasText: coluna.homologacao.dispositivo.nomeComercial })
    .first()
  await alvo.locator('[data-menu-coluna]').click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: 'Observação' }).click()
  await p.waitForSelector('[role=dialog]')
  const caderno = await p.evaluate(() => {
    const d = document.querySelector('[role=dialog]')
    return {
      geral: d.querySelector('textarea').value,
      anotacoes: [...(d.querySelectorAll('[data-anotacoes] li') ?? [])].map((li) => ({
        item: li.querySelector('span').textContent.trim(),
        texto: li.querySelector('p').textContent.trim(),
      })),
      // A lista é só leitura: editar é na célula de onde a nota saiu
      camposEditaveis: d.querySelectorAll('[data-anotacoes] input, [data-anotacoes] textarea').length,
    }
  })
  console.log(`3b. Caderno — geral igual ao banco: ${caderno.geral === marca} | anotações: ${JSON.stringify(caderno.anotacoes)}`)
  if (caderno.geral !== marca) erros.push('O modal não trouxe a observação geral gravada')

  // Só o que o técnico digitou: as notas que a importação escreveu ficam fora.
  //
  // A conta é contra o BANCO, não contra as duas que este roteiro escreveu: a
  // coluna pode ter anotações de verdade, feitas por quem usa o sistema, e
  // exigir "exatamente 2" transformava uma nota legítima em falha de teste.
  const doBanco = await api('/matriz?categoriaSlug=pos')
  const daColuna = doBanco.corpo.colunas.find((c) => c.homologacao.id === coluna.homologacao.id)
  const escritasAMao = daColuna.homologacao.resultados.filter(
    (r) => r.observacao?.trim() && !/planilha de origem|planilha:|na planilha/i.test(r.observacao),
  )
  console.log(`3b2. Anotações à mão no banco: ${escritasAMao.length} | no caderno: ${caderno.anotacoes.length}`)
  if (caderno.anotacoes.length !== escritasAMao.length) {
    erros.push(
      `O caderno lista ${caderno.anotacoes.length} anotações e o banco tem ${escritasAMao.length} escritas à mão`,
    )
  }
  const daImportacao = caderno.anotacoes.filter((a) => /planilha/i.test(a.texto))
  if (daImportacao.length) {
    erros.push(`Anotações da importação vazaram para o caderno: ${JSON.stringify(daImportacao)}`)
  }
  for (const { item: it, texto } of notas) {
    const achou = caderno.anotacoes.some((a) => a.item === it.nome && a.texto === texto)
    if (!achou) erros.push(`Falta a anotação de "${it.nome}" no caderno`)
  }
  if (caderno.camposEditaveis > 0) {
    erros.push('As anotações do caderno viraram editáveis — elas se editam na célula')
  }
  await p.keyboard.press('Escape')

  // --- 3c. Filtro de modelo, ao lado do de fabricante ---
  const filtros = await p.locator('button[aria-haspopup=listbox]').allTextContents()
  console.log(`3c. Filtros: ${JSON.stringify(filtros.map((t) => t.replace('▾', '').trim()))}`)
  if (!filtros.some((t) => t.includes('Modelo'))) erros.push('Falta o filtro de modelo')

  const antesDoFiltro = await p.locator('thead th[data-modelo]').count()
  const seletorModelo = p.locator('button[data-filtro="Modelo"]')
  await seletorModelo.click()
  const opcoesModelo = await p.locator('[role=option]').allTextContents()
  await p.locator('[role=option]').nth(1).click()
  await p.waitForTimeout(600)
  const depoisDoFiltro = await p.locator('thead th[data-modelo]').count()
  console.log(`3d. Modelos no seletor: ${opcoesModelo.length - 1} | colunas ${antesDoFiltro} → ${depoisDoFiltro}`)
  if (depoisDoFiltro !== 1) erros.push(`Filtrar por um modelo deveria deixar 1 coluna, deixou ${depoisDoFiltro}`)
  // "Todos os modelos" restaura
  await seletorModelo.click()
  await p.locator('[role=option]').first().click()
  await p.waitForTimeout(600)
  const restaurado = await p.locator('thead th[data-modelo]').count()
  console.log(`3e. "Todos os modelos" restaura: ${restaurado === antesDoFiltro}`)
  if (restaurado !== antesDoFiltro) erros.push('O filtro de modelo não voltou ao estado inicial')

  // --- 4. "Revalidados" no lugar de "Retestados" ---
  const rotulos = await p.evaluate(() => document.body.textContent)
  console.log(`4. Matriz — "Revalidados": ${rotulos.includes('Revalidados')} | "Retestados": ${rotulos.includes('Retestados')}`)
  if (!rotulos.includes('Revalidados')) erros.push('O filtro não virou "Revalidados" na matriz')
  if (rotulos.includes('Retestados')) erros.push('Sobrou "Retestados" na matriz')

  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' })
  await p.waitForSelector('[data-marca]')
  const painel = await p.evaluate(() => {
    const m = document.querySelector('[data-marca]')
    const s = getComputedStyle(m)
    const quatro = m.querySelector('span')
    return {
      abas: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.replace(/\d+$/, '').trim()),
      marca: m.textContent.trim(),
      corDaMarca: s.color,
      corDoQuatro: getComputedStyle(quatro).color,
      fundo: s.backgroundColor,
      desfoque: s.backdropFilter || s.webkitBackdropFilter,
      temBorda: parseFloat(s.borderTopWidth) > 0,
    }
  })
  console.log(`4b. Abas: ${JSON.stringify(painel.abas)}`)
  console.log(`4c. Marca: "${painel.marca}" ${painel.corDaMarca} | "4" ${painel.corDoQuatro} | ${painel.fundo} | ${painel.desfoque} | borda ${painel.temBorda}`)
  if (!painel.abas.includes('Revalidados')) erros.push(`A aba não virou "Revalidados": ${JSON.stringify(painel.abas)}`)
  if (painel.abas.includes('Retestados')) erros.push('Sobrou a aba "Retestados"')
  if (painel.marca.toLowerCase() !== 'cloud4mobile') erros.push(`Marca do painel: "${painel.marca}"`)
  if (painel.corDaMarca !== 'rgb(126, 32, 101)') erros.push(`A marca deveria ser roxa: ${painel.corDaMarca}`)
  if (painel.corDoQuatro !== 'rgb(243, 120, 4)') erros.push(`O "4" deveria ser laranja: ${painel.corDoQuatro}`)
  if (!painel.temBorda) erros.push('A pastilha da marca ficou sem borda')
  if (!/blur/.test(painel.desfoque)) erros.push(`A pastilha da marca não é de vidro: ${painel.desfoque}`)
  // Véu, não bloco de cor
  const alfa = parseFloat(painel.fundo.match(/[\d.]+\)$/)?.[0] ?? '1')
  if (alfa > 0.2) erros.push(`A pastilha da marca está chapada demais: alfa ${alfa}`)

  await p.screenshot({ path: `${SAIDA}/81-painel-marca.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-observacoes.png` }).catch(() => {})
} finally {
  // Devolve as células e as observações ao estado anterior
  if (restaurar) {
    const a = restaurar.antes
    const devolver = (itemId, r) =>
      api(`/homologacoes/${restaurar.homId}/resultados/${itemId}`, {
        method: 'PUT',
        body: {
          status: r?.status ?? 'NAO_TESTADO',
          observacao: r?.observacao ?? null,
          justificativaId: r?.justificativaId ?? null,
          justificativaTexto: r?.justificativaTexto ?? null,
        },
      }).catch(() => {})

    for (const n of restaurar.notas ?? []) await devolver(n.item.id, n.antes)
    await devolver(restaurar.itemId, a)
    const volta = await api(`/homologacoes/${restaurar.homId}`, {
      method: 'PATCH',
      body: { observacoes: null },
    }).catch(() => ({ status: 'exceção' }))
    console.log(`5. Cobaia restaurada (status "${a?.status}") | observações limpas: HTTP ${volta.status}`)
  }
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
