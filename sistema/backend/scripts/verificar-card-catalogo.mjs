/**
 * O card do catálogo da home só aparece com homologação finalizada — e hoje
 * nenhum dos 31 modelos reais está finalizado. Este roteiro cria um modelo
 * descartável, leva até APROVADO, confere o card e desativa o dispositivo no
 * fim. Nada de dado real é tocado: o modelo nasce e morre aqui dentro.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const marca = Date.now().toString().slice(-6)
const NOME = `ZZ Vitrine ${marca}`
const erros = []
let dispositivoId = null

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

/** Chama a API com o token que o front guardou */
const apiNaPagina = (caminho, opcoes = {}) =>
  p.evaluate(
    async ([c, o]) => {
      // Content-Type só quando há corpo: com application/json e corpo vazio
      // o Fastify recusa a requisição com 400 antes de chegar na rota.
      const headers = { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` }
      if (o.body) headers['Content-Type'] = 'application/json'
      const r = await fetch(`/api${c}`, {
        method: o.method ?? 'GET',
        headers,
        body: o.body ? JSON.stringify(o.body) : undefined,
      })
      const texto = await r.text()
      return { ok: r.ok, status: r.status, corpo: texto ? JSON.parse(texto) : null }
    },
    [caminho, opcoes],
  )

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.waitForTimeout(800)

  // --- 1. Modelo descartável ---
  const categorias = (await apiNaPagina('/categorias')).corpo
  const pos = categorias.find((c) => c.slug === 'pos')
  const baterias = (await apiNaPagina(`/baterias?categoriaId=${pos.id}`)).corpo
  const bateria = baterias[0]

  const criado = await apiNaPagina('/matriz/modelo', {
    method: 'POST',
    body: {
      categoriaId: pos.id,
      fabricante: 'ZZ Teste',
      modelo: `VIT-${marca}`,
      nomeComercial: NOME,
      bateriaId: bateria.id,
      numeroSerie: `SN-${marca}`,
      versaoSo: 'Android 13',
      gerenciamento: 'ANDROID_LEGADO',
      tipoAgente: 'Agente PoS',
      versaoAgente: '11.27.0',
      metodoInscricao: 'QR Code',
      dataInicio: new Date().toISOString(),
    },
  })
  if (!criado.ok) throw new Error(`Não criou o modelo: ${JSON.stringify(criado.corpo)}`)
  dispositivoId = criado.corpo.id
  const homologacaoId = criado.corpo.homologacoes[0].id
  console.log(`1. Modelo descartável criado: ${NOME}`)

  // --- 2. Tudo OK e finaliza ---
  for (const r of criado.corpo.homologacoes[0].resultados) {
    await apiNaPagina(`/homologacoes/${homologacaoId}/resultados/${r.itemId}`, {
      method: 'PUT',
      body: { status: 'OK', observacao: null, justificativaId: null, justificativaTexto: null },
    })
  }
  const revisao = await apiNaPagina(`/homologacoes/${homologacaoId}/status`, {
    method: 'POST',
    body: { novoStatus: 'EM_REVISAO' },
  })
  if (!revisao.ok) throw new Error(`EM_REVISAO falhou: ${JSON.stringify(revisao.corpo)}`)
  const aprovado = await apiNaPagina(`/homologacoes/${homologacaoId}/status`, {
    method: 'POST',
    body: { novoStatus: 'APROVADO', homologado: true },
  })
  if (!aprovado.ok) throw new Error(`APROVADO falhou: ${JSON.stringify(aprovado.corpo)}`)
  console.log('2. Homologação levada a APROVADO / homologado')

  // --- 3. O card tem que estar no catálogo da home ---
  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1000)

  const card = p.locator(`[data-modelo="${NOME}"]`)
  const apareceu = (await card.count()) > 0
  console.log(`3. Card no catálogo: ${apareceu}`)
  if (!apareceu) erros.push('O modelo finalizado não apareceu no catálogo da home')

  if (apareceu) {
    const conteudo = await card.evaluate((el) => ({
      texto: el.textContent.replace(/\s+/g, ' ').trim(),
      ehExemplo: el.textContent.includes('Exemplo'),
    }))
    console.log(`   ${conteudo.texto}`)
    if (conteudo.ehExemplo) erros.push('Modelo real marcado como exemplo')

    // "Exibir informações" leva direto à tela do resultado completo
    await card.locator('a:has-text("Exibir informações")').click()
    await p.waitForTimeout(1000)
    const tela = await p.evaluate(() => ({
      url: location.pathname,
      // O resultado virou tabela: a lista de <li> não existe mais
      itens: document.querySelectorAll('tbody tr').length,
      temBaixar: [...document.querySelectorAll('button')].some((b) =>
        b.textContent.includes('Certificado técnico'),
      ),
    }))
    console.log(`   tela: ${JSON.stringify(tela)}`)
    if (!tela.url.startsWith('/dispositivos/')) erros.push(`Não navegou: ${tela.url}`)
    if (tela.itens < 40) erros.push(`Resultado incompleto: ${tela.itens} itens`)
    if (!tela.temBaixar) erros.push('Falta o botão de baixar o certificado técnico')
    await p.goBack()
    await p.waitForTimeout(700)
    if (!conteudo.texto.includes('Homologado')) erros.push('O card não mostra o selo Homologado')
    if (/Android Android/.test(conteudo.texto)) erros.push('Versão do Android duplicando o prefixo')
    await card.screenshot({ path: `${SAIDA}/50-card-catalogo.png` })
  }

  const preview = await p.locator(`[data-em-homologacao="${NOME}"]`).count()
  console.log(`4. Ainda no bloco "em homologação": ${preview} (esperado 0)`)
  if (preview > 0) erros.push('Modelo finalizado continua no bloco de em homologação')
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-card-catalogo.png` }).catch(() => {})
} finally {
  // --- 4. Limpeza: o dispositivo sai de todas as telas ---
  if (dispositivoId) {
    const r = await apiNaPagina(`/dispositivos/${dispositivoId}`, { method: 'DELETE' }).catch(
      (e) => ({ ok: false, status: `exceção: ${e.message}` }),
    )
    console.log(`5. Modelo descartável desativado: ${r.ok} (${r.status})`)
    if (!r.ok) erros.push(`SOBROU LIXO: dispositivo ${dispositivoId} ficou ativo — ${r.status}`)
  }
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
