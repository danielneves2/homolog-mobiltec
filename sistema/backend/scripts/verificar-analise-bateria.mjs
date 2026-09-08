/**
 * Duas mudanças da mesma leva:
 *
 * 1. Desmarcar um item na edição do tipo tem de tirar a linha da planilha NA
 *    HORA, mesmo que o item já tenha resultado gravado — e a linha tem de
 *    voltar inteira, com o que estava preenchido, ao remarcar. Nada é apagado.
 * 2. A "Análise das Divergências" pode ser assumida pelo técnico: editar e
 *    apagar até os blocos que vieram por padrão, acrescentar temas próprios, e
 *    voltar ao automático.
 *
 * Roda contra um tipo descartável, criado e apagado aqui, para não mexer no
 * PoS de verdade.
 */
import { chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const NOME_TIPO = 'Zz Analise Automatizada'
const erros = []
const prisma = new PrismaClient()

async function limpar() {
  const cats = await prisma.categoria.findMany({
    where: { nome: { startsWith: 'Zz Analise' } },
    select: { id: true },
  })
  const ids = cats.map((c) => c.id)
  if (!ids.length) return 0
  const disp = await prisma.dispositivo.findMany({
    where: { categoriaId: { in: ids } },
    select: { id: true },
  })
  const homs = await prisma.homologacao.findMany({
    where: { dispositivoId: { in: disp.map((d) => d.id) } },
    select: { id: true },
  })
  await prisma.resultado.deleteMany({ where: { homologacaoId: { in: homs.map((h) => h.id) } } })
  await prisma.homologacao.deleteMany({ where: { id: { in: homs.map((h) => h.id) } } })
  await prisma.dispositivo.deleteMany({ where: { id: { in: disp.map((d) => d.id) } } })
  const bats = await prisma.bateriaTeste.findMany({
    where: { categoriaId: { in: ids } },
    select: { id: true },
  })
  await prisma.bateriaItem.deleteMany({ where: { bateriaId: { in: bats.map((b) => b.id) } } })
  await prisma.bateriaTeste.deleteMany({ where: { id: { in: bats.map((b) => b.id) } } })
  await prisma.categoria.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}

await limpar()

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
      return { status: r.status, corpo: t ? JSON.parse(t) : null }
    },
    [caminho, opcoes],
  )

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.waitForTimeout(600)

  // --- Monta o cenário: tipo com bateria e um modelo dentro ---
  const catalogo = (await api('/itens-teste')).corpo
  const comandos = catalogo.filter((i) => i.grupo === 'COMANDOS')
  const tipo = await api('/tipos-dispositivo', {
    method: 'POST',
    body: {
      nome: NOME_TIPO,
      icone: 'caixa',
      camposFicha: [],
      itensExistentes: catalogo.map((i) => i.id),
      itensNovos: [],
    },
  })
  const categoriaId = tipo.corpo.categoria.id
  const slug = tipo.corpo.categoria.slug
  const bateriaId = tipo.corpo.bateria.id

  const modelo = await api('/matriz/modelo', {
    method: 'POST',
    body: {
      categoriaId,
      fabricante: 'Zz Fab',
      modelo: 'Zz Mod',
      nomeComercial: 'Zz Modelo da Análise',
      bateriaId,
      numeroSerie: 'ZZ-9',
      versaoSo: 'Android 13',
      gerenciamento: 'ANDROID_LEGADO',
      tipoAgente: 'Agente PoS',
      versaoAgente: '1.0.0',
      metodoInscricao: 'ADB / Arquivo',
      dataInicio: new Date().toISOString().slice(0, 10),
    },
  })
  const homId = modelo.corpo.homologacoes[0].id
  console.log(`0. Tipo "${slug}" com ${catalogo.length} itens e 1 modelo`)

  // Dá resultado de verdade a dois comandos: é o caso que antes travava a
  // planilha, porque item com resultado nunca saía da tela
  const [comA, comB] = comandos
  for (const [item, status, just] of [
    [comA, 'NAO_SUPORTADO', 'Limitação conhecida da plataforma neste modelo.'],
    [comB, 'FALHA', 'Falha reproduzida em bancada, reportada ao fabricante.'],
  ]) {
    await api(`/homologacoes/${homId}/resultados/${item.id}`, {
      method: 'PUT',
      body: { status, observacao: null, justificativaId: null, justificativaTexto: just },
    })
  }

  // ============ 1. Desmarcar tira a linha na hora ============
  const antes = (await api(`/matriz?categoriaSlug=${slug}`)).corpo
  console.log(`1. Planilha antes: ${antes.itens.length} linhas`)

  const semOsDois = catalogo.filter((i) => i.id !== comA.id && i.id !== comB.id).map((i) => i.id)
  const tirou = await api(`/tipos-dispositivo/${categoriaId}`, {
    method: 'PATCH',
    body: { itensExistentes: semOsDois, itensNovos: [] },
  })
  console.log(
    `1b. Tirando "${comA.nome}" e "${comB.nome}": removidos ${tirou.corpo.removidos} | preservados ${JSON.stringify(tirou.corpo.preservados)}`,
  )

  const depois = (await api(`/matriz?categoriaSlug=${slug}`)).corpo
  const aindaVisiveis = depois.itens.filter((i) => i.id === comA.id || i.id === comB.id)
  console.log(`1c. Planilha depois: ${depois.itens.length} linhas | os dois ainda à vista: ${aindaVisiveis.length}`)
  if (depois.itens.length !== antes.itens.length - 2) {
    erros.push(`A planilha deveria cair para ${antes.itens.length - 2} linhas, ficou com ${depois.itens.length}`)
  }
  if (aindaVisiveis.length) {
    erros.push(`Item desmarcado continua na planilha: ${aindaVisiveis.map((i) => i.nome).join(', ')}`)
  }

  // E os resultados sumiram junto com as linhas, para não contarem no medidor
  const resultadosVisiveis = depois.colunas[0].homologacao.resultados
  if (resultadosVisiveis.some((r) => r.itemId === comA.id || r.itemId === comB.id)) {
    erros.push('Resultado de item fora da bateria vazou para a matriz — contaria sem ter linha')
  }

  // --- Mas nada foi apagado do banco ---
  const noBanco = await prisma.resultado.findMany({
    where: { homologacaoId: homId, itemId: { in: [comA.id, comB.id] } },
    select: { status: true, justificativaTexto: true },
  })
  console.log(`1d. No banco continuam ${noBanco.length} resultados: ${noBanco.map((r) => r.status).join(', ')}`)
  if (noBanco.length !== 2) {
    erros.push(`Os resultados avaliados foram destruídos: sobraram ${noBanco.length} de 2`)
  }

  // --- E voltam inteiros ao remarcar ---
  await api(`/tipos-dispositivo/${categoriaId}`, {
    method: 'PATCH',
    body: { itensExistentes: catalogo.map((i) => i.id), itensNovos: [] },
  })
  const devolvida = (await api(`/matriz?categoriaSlug=${slug}`)).corpo
  const voltou = devolvida.colunas[0].homologacao.resultadosPorItem[comA.id]
  console.log(
    `1e. Remarcando: ${devolvida.itens.length} linhas | "${comA.nome}" voltou como ${voltou?.status}`,
  )
  if (devolvida.itens.length !== antes.itens.length) {
    erros.push(`Remarcar deveria devolver ${antes.itens.length} linhas, deu ${devolvida.itens.length}`)
  }
  if (voltou?.status !== 'NAO_SUPORTADO') {
    erros.push(`A linha voltou vazia em vez de trazer o que estava preenchido: ${JSON.stringify(voltou)}`)
  }

  // ============ 1f. Justificar na planilha chega ao certificado na hora ============
  //
  // Sem sair da aplicação: a prévia do certificado é HTML do servidor, guardado
  // em cache pelo cliente. Salvar a célula tem de invalidar esse cache, senão o
  // documento continua servindo a versão anterior e parece que a justificativa
  // não salvou. Recarregar a página mascararia o defeito — daí a navegação ser
  // toda pelo menu, dentro da própria SPA.
  const TEXTO_AO_VIVO = 'Justificativa escrita na planilha, conferida ao vivo no certificado.'
  await p.goto(`http://localhost:8080/matriz/${slug}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(700)

  const irAoCertificado = async () => {
    await p.locator('thead th[data-modelo] [data-menu-coluna]').first().click()
    await p.waitForSelector('[data-menu-aberto]')
    await p.locator('[data-menu-aberto] button', { hasText: 'Certificado' }).click()
    await p.waitForURL(/\/certificado$/)
    await p.waitForTimeout(1200)
  }

  // Primeiro passa pelo certificado, para o cache existir
  await irAoCertificado()
  const antesDoAoVivo = await p.locator('iframe, [data-preview]').count()
  await p.goBack()
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(700)

  // O item já está divergente e sem explicação — é a situação em que o
  // técnico abre a célula para justificar
  const comC = comandos[2]
  await api(`/homologacoes/${homId}/resultados/${comC.id}`, {
    method: 'PUT',
    body: {
      status: 'COM_RESSALVA',
      observacao: null,
      justificativaId: null,
      justificativaTexto: null,
    },
  })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(700)
  await irAoCertificado()
  await p.goBack()
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(700)

  // Agora justifica pela célula, como o técnico faz
  const celula = p.locator(`tbody tr[data-item="${comC.nome}"] [data-status]`).first()
  await celula.scrollIntoViewIfNeeded()
  await celula.click()
  await p.waitForSelector('[role=menu]')
  await p.locator('[role=menu] button', { hasText: 'Justificativa' }).click()
  await p.waitForSelector('[role=dialog]')
  // O painel abre na biblioteca quando o item ainda não tem texto próprio; a
  // caixa de escrever só existe depois deste clique
  const livre = p.locator('[role=dialog] button', { hasText: 'Escrever um texto livre' })
  if (await livre.count()) await livre.click()
  await p.waitForSelector('[role=dialog] textarea')
  await p.locator('[role=dialog] textarea').first().fill(TEXTO_AO_VIVO)
  await p.locator('[role=dialog] button', { hasText: /^Aplicar / }).click()
  await p.waitForTimeout(1400)

  // E volta ao certificado pelo menu — sem recarregar nada
  await irAoCertificado()
  const noDocumento = await p.evaluate(
    (t) => document.body.innerHTML.includes(t),
    TEXTO_AO_VIVO,
  )
  console.log(
    `1f. Justificativa da planilha no certificado sem recarregar: ${noDocumento} (prévia montada: ${antesDoAoVivo >= 0})`,
  )
  if (!noDocumento) {
    erros.push('A justificativa escrita na planilha não chegou ao certificado sem recarregar')
  }

  // ============ 2. A análise do certificado, na mão ============
  await p.goto(`http://localhost:8080/homologacoes/${homId}/certificado`, {
    waitUntil: 'networkidle',
  })
  await p.waitForSelector('[data-personalizar-analise], [data-blocos-analise]')
  await p.waitForTimeout(600)

  // Quantos parágrafos as justificativas produzem agora: um por texto
  // distinto entre os itens divergentes. Contado da planilha, não gravado
  // aqui — este roteiro já justificou itens em três momentos diferentes.
  const contarParagrafos = async () => {
    const m = (await api(`/matriz?categoriaSlug=${slug}`)).corpo
    const textos = m.colunas[0].homologacao.resultados
      .filter((r) => ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status))
      .map((r) => r.justificativaTexto ?? r.justificativa?.texto)
      .filter(Boolean)
    return new Set(textos).size
  }
  const esperadoAuto = await contarParagrafos()

  const automatica = (await api(`/homologacoes/${homId}/certificado/analise`)).corpo
  console.log(
    `2. Análise automática: manual=${automatica.manual} | ${automatica.blocos.length} bloco(s), esperado ${esperadoAuto}: ${JSON.stringify(automatica.blocos.map((b) => b.subtitulo))}`,
  )
  if (automatica.manual) erros.push('A análise já nasceu manual')
  if (automatica.blocos.length !== esperadoAuto) {
    erros.push(`Esperava ${esperadoAuto} blocos vindos das justificativas, veio ${automatica.blocos.length}`)
  }

  // O documento tem de trazer esses mesmos textos antes de qualquer edição
  const htmlAuto = await p.evaluate(
    (id) =>
      fetch(`/api/homologacoes/${id}/certificado/preview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
      }).then((r) => r.text()),
    homId,
  )
  if (!htmlAuto.includes('Limitação conhecida da plataforma neste modelo.')) {
    erros.push('O certificado automático não trouxe a justificativa do item divergente')
  }

  // --- Personalizar copia o automático e libera a edição ---
  await p.click('[data-personalizar-analise]')
  await p.waitForSelector('[data-bloco-analise]')
  await p.waitForTimeout(500)
  const quantos = await p.locator('[data-bloco-analise]').count()
  console.log(`2b. Personalizada: ${quantos} bloco(s) editáveis`)
  if (quantos !== esperadoAuto) {
    erros.push(`Personalizar deveria copiar os ${esperadoAuto} blocos, copiou ${quantos}`)
  }

  // --- Edita o título de um bloco que veio por padrão, apaga o outro,
  //     e acrescenta um tema que não existe em justificativa nenhuma ---
  const primeiro = p.locator('[data-bloco-analise]').first()
  await primeiro.locator('[data-campo="titulo"]').fill('Observações do Cliente')
  await primeiro.locator('[data-campo="subtitulo"]').fill('Escopo desta homologação')
  await primeiro.locator('[data-campo="texto"]').fill('Texto que substitui o que veio por padrão.')

  // Apaga o bloco PELO TEXTO, não por índice: a ordem dos automáticos segue
  // as justificativas da planilha, e endereçar por posição fez a asserção lá
  // embaixo cobrar um bloco que nunca tinha sido apagado.
  const TEXTO_A_APAGAR = 'Falha reproduzida em bancada, reportada ao fabricante.'
  const indiceApagar = await p.evaluate(
    (alvo) =>
      [...document.querySelectorAll('[data-bloco-analise]')].findIndex(
        (b) => b.querySelector('[data-campo="texto"]').value.trim() === alvo,
      ),
    TEXTO_A_APAGAR,
  )
  if (indiceApagar < 0) erros.push('Não achei o bloco a apagar entre os copiados')
  await p
    .locator('[data-bloco-analise]')
    .nth(indiceApagar)
    .locator('[data-acao-bloco="Remover bloco"]')
    .click()
  await p.click('[data-novo-bloco]')
  // `last()`: o bloco novo é acrescentado no fim. Endereçar por índice fixo
  // acertava outro bloco e deixava o novo em branco — que some ao salvar.
  const novo = p.locator('[data-bloco-analise]').last()
  await novo.locator('[data-campo="titulo"]').fill('Tema Livre')
  await novo.locator('[data-campo="texto"]').fill('Assunto proprio deste modelo, sem justificativa.')

  await p.click('[data-salvar-analise]')
  await p.waitForTimeout(900)

  const salva = (await api(`/homologacoes/${homId}/certificado/analise`)).corpo
  console.log(
    `2c. Salva: manual=${salva.manual} | ${JSON.stringify(salva.blocos.map((b) => b.titulo))}`,
  )
  if (!salva.manual) erros.push('A análise não ficou marcada como manual')
  // Os automáticos, menos o apagado, mais o escrito na hora
  if (salva.blocos.length !== esperadoAuto) {
    erros.push(`Esperava ${esperadoAuto} blocos depois de apagar um e criar outro, veio ${salva.blocos.length}`)
  }
  if (salva.blocos[0]?.titulo !== 'Observações do Cliente') {
    erros.push(`O título do bloco padrão não foi editado: ${JSON.stringify(salva.blocos[0])}`)
  }

  // --- E o documento passa a sair exatamente assim ---
  const htmlManual = await p.evaluate(
    (id) =>
      fetch(`/api/homologacoes/${id}/certificado/preview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
      }).then((r) => r.text()),
    homId,
  )
  const temNovo = htmlManual.includes('Assunto proprio deste modelo, sem justificativa.')
  const temEditado = htmlManual.includes('Texto que substitui o que veio por padrão.')
  const temApagado = htmlManual.includes(TEXTO_A_APAGAR)
  console.log(`2d. Documento — tema livre: ${temNovo} | bloco editado: ${temEditado} | bloco apagado ainda presente: ${temApagado}`)
  if (!temNovo) erros.push('O tema escrito à mão não saiu no certificado')
  if (!temEditado) erros.push('O texto editado não substituiu o que vinha por padrão')
  if (temApagado) erros.push('O bloco apagado continua saindo no certificado')

  await p.screenshot({ path: `${SAIDA}/94-analise-divergencias.png` })

  // ============ 3. Justificativa nova escrita na planilha ============
  //
  // Com a seção automática, justificar um item na matriz já põe o parágrafo no
  // documento. Com ela assumida, isso para — e o texto não pode sumir calado.
  const comD = comandos[3]
  const TEXTO_NOVO = 'Justificativa escrita na planilha depois de personalizar.'
  await api(`/homologacoes/${homId}/resultados/${comD.id}`, {
    method: 'PUT',
    body: {
      status: 'COM_RESSALVA',
      observacao: null,
      justificativaId: null,
      justificativaTexto: TEXTO_NOVO,
    },
  })

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('[data-blocos-analise]')
  await p.waitForTimeout(700)

  const alerta = await p.evaluate(() => {
    const el = document.querySelector('[data-novas-justificativas]')
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null
  })
  console.log(`3. Aviso de justificativa nova: ${alerta ? `"${alerta}"` : 'NENHUM'}`)
  if (!alerta) erros.push('A justificativa escrita na planilha não foi anunciada no painel')
  else {
    if (!alerta.includes(comD.nome)) erros.push(`O aviso não nomeia "${comD.nome}": "${alerta}"`)
    // Só a nova. Os dois blocos do começo foram reescritos e apagados de
    // propósito no passo 2 — oferecer os dois de volta seria desfazer a
    // decisão do técnico a cada visita.
    if (!/^Uma justificativa nova/.test(alerta)) {
      erros.push(`O aviso deveria anunciar só a justificativa nova: "${alerta}"`)
    }
    if (alerta.includes(comA.nome) || alerta.includes(comB.nome)) {
      erros.push(`Bloco reescrito ou apagado de propósito voltou como novidade: "${alerta}"`)
    }
  }

  // ANTES de trazer: salvar por outro motivo não pode marcar a justificativa
  // como tratada. Era o defeito que engoliu dois parágrafos do usuário — o
  // servidor recalculava "tudo que existe agora" a cada gravação.
  await p.locator('[data-bloco-analise]').first().locator('[data-campo="titulo"]').fill('Mexido à toa')
  await p.click('[data-salvar-analise]')
  await p.waitForTimeout(900)
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('[data-blocos-analise]')
  await p.waitForTimeout(700)
  const sobreviveuAoSalvar = await p.evaluate(() =>
    document.querySelector('[data-novas-justificativas]') ? 'continua oferecida' : 'FOI ENGOLIDA',
  )
  console.log(`3a2. Depois de salvar por outro motivo, a justificativa ${sobreviveuAoSalvar}`)
  if (sobreviveuAoSalvar !== 'continua oferecida') {
    erros.push('Salvar a análise por outro motivo engoliu a justificativa nova')
  }

  await p.click('[data-trazer-novas]')
  await p.click('[data-salvar-analise]')
  await p.waitForTimeout(900)

  const htmlComNova = await p.evaluate(
    (id) =>
      fetch(`/api/homologacoes/${id}/certificado/preview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
      }).then((r) => r.text()),
    homId,
  )
  console.log(`3b. Documento recebeu a justificativa nova: ${htmlComNova.includes(TEXTO_NOVO)}`)
  if (!htmlComNova.includes(TEXTO_NOVO)) {
    erros.push('"Trazer para a análise" não levou a justificativa nova ao certificado')
  }

  // Trazida uma vez, o aviso some — senão ele voltaria a cada visita
  const alertaDepois = await p.evaluate(() =>
    document.querySelector('[data-novas-justificativas]') ? 'ainda aparece' : 'sumiu',
  )
  console.log(`3c. Depois de trazer, o aviso ${alertaDepois}`)
  if (alertaDepois !== 'sumiu') erros.push('O aviso de justificativa nova não some depois de trazida')

  // --- Voltar ao automático devolve a seção às justificativas ---
  p.once('dialog', (d) => d.accept())
  await p.click('[data-voltar-automatico]')
  await p.waitForTimeout(900)
  const devolvidaAnalise = (await api(`/homologacoes/${homId}/certificado/analise`)).corpo
  console.log(
    `4. Voltou ao automático: manual=${devolvidaAnalise.manual} | ${devolvidaAnalise.blocos.length} bloco(s)`,
  )
  if (devolvidaAnalise.manual) erros.push('"Voltar ao automático" não desfez o modo manual')
  // De volta ao automático, o que manda são as justificativas da planilha —
  // inclusive as escritas depois de personalizar
  const paragrafosAgora = await contarParagrafos()
  if (devolvidaAnalise.blocos.length !== paragrafosAgora) {
    erros.push(
      `O automático deveria voltar com ${paragrafosAgora} blocos, veio ${devolvidaAnalise.blocos.length}`,
    )
  }

  // --- Aprovada é somente leitura, aqui também ---
  await api(`/homologacoes/${homId}/status`, { method: 'POST', body: { novoStatus: 'EM_REVISAO' } })
  await api(`/homologacoes/${homId}/status`, {
    method: 'POST',
    body: { novoStatus: 'APROVADO', homologado: true },
  })
  const travada = await api(`/homologacoes/${homId}/certificado/analise`, {
    method: 'PUT',
    body: { blocos: [] },
  })
  console.log(`2f. Editar análise de aprovada: HTTP ${travada.status}`)
  if (travada.status !== 403) {
    erros.push(`Homologação aprovada deveria recusar a edição da análise: HTTP ${travada.status}`)
  }
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-analise.png` }).catch(() => {})
} finally {
  await nav.close()
  console.log(`\nLimpeza: ${await limpar()} tipo(s) de verificação removido(s)`)
  await prisma.$disconnect()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
