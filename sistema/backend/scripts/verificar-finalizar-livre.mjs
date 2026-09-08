/**
 * Dois pedidos da mesma leva:
 *
 * 1. Menus da matriz não podem nascer cortados pela borda de baixo da tela.
 * 2. Pendência não bloqueia a finalização — vira checklist informativo.
 *
 * O item 2 é testado de ponta a ponta: finaliza de verdade uma homologação
 * COM pendências e depois reabre, devolvendo a coluna ao estado anterior.
 * O único resíduo seria o log de reabertura, que o script apaga no fim.
 */
import { chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const API = 'http://localhost:3001'
const erros = []
const prisma = new PrismaClient()

const api = async (rota, opcoes = {}, token) => {
  const r = await fetch(`${API}${rota}`, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  return { status: r.status, corpo: await r.json().catch(() => null) }
}

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1400, height: 700 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

let idFinalizada = null
let token = null

try {
  // ============ Parte 1: menus não cortados ============
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('tbody button[data-status]')
  await p.waitForTimeout(600)

  /** Abre um menu e devolve o quanto ele vaza da janela. */
  async function medirMenu(abrir, seletor) {
    await abrir()
    await p.waitForSelector(seletor, { timeout: 4000 })
    const r = await p.locator(seletor).evaluate((el) => {
      const b = el.getBoundingClientRect()
      return {
        topo: Math.round(b.top),
        base: Math.round(b.bottom),
        janela: window.innerHeight,
      }
    })
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    return { ...r, vazaEmbaixo: Math.max(0, r.base - r.janela), vazaEmCima: Math.max(0, -r.topo) }
  }

  // A última célula visível é justamente a que abria cortada
  const celulas = p.locator('tbody button[data-status]:not([disabled])')
  const n = await celulas.count()
  const ultima = celulas.nth(n - 1)
  await ultima.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)

  const menuCelula = await medirMenu(() => ultima.click(), '[role=menu]')
  console.log(`1. Menu da última célula: ${JSON.stringify(menuCelula)}`)
  if (menuCelula.vazaEmbaixo > 0 || menuCelula.vazaEmCima > 0) {
    erros.push(`O menu da célula nasce cortado: vaza ${menuCelula.vazaEmbaixo}px embaixo`)
  }

  // O caso que motivou o pedido: célula tão perto do rodapé que o menu não
  // cabe abaixo dela. Aqui ele TEM de virar para cima — só "não vazar" não
  // provaria nada, porque uma célula do meio da tela nunca vazaria.
  const semEspaco = await celulas.evaluateAll((els) => {
    const alturaDoMenu = 210
    const candidatas = els
      .map((el, i) => ({ i, base: el.getBoundingClientRect().bottom, topo: el.getBoundingClientRect().top }))
      .filter((c) => c.topo > 0 && window.innerHeight - c.base < alturaDoMenu)
    return candidatas.sort((a, b) => b.base - a.base)[0] ?? null
  })

  if (!semEspaco) {
    erros.push('Nenhuma célula ficou perto do rodapé — o teste não exercitou a virada')
  } else {
    const menuVirado = await medirMenu(() => celulas.nth(semEspaco.i).click(), '[role=menu]')
    const virouParaCima = menuVirado.base <= Math.round(semEspaco.topo) + 1
    console.log(
      `2. Célula a ${Math.round(700 - semEspaco.base)}px do rodapé — menu virou para cima: ${virouParaCima} ${JSON.stringify(menuVirado)}`,
    )
    if (menuVirado.vazaEmbaixo > 0) erros.push('O menu ainda nasce cortado pela borda de baixo')
    if (!virouParaCima) erros.push('O menu deveria ter aberto acima da célula')
  }

  // Dropdowns da barra de filtros
  const filtros = p.locator('button[aria-haspopup=listbox]')
  for (let i = 0; i < (await filtros.count()); i++) {
    const m = await medirMenu(() => filtros.nth(i).click(), '[role=listbox]')
    console.log(`3.${i} Filtro: ${JSON.stringify(m)}`)
    if (m.vazaEmbaixo > 0 || m.vazaEmCima > 0) {
      erros.push(`O filtro ${i} abre fora da janela: ${JSON.stringify(m)}`)
    }
  }

  // ============ Parte 2: finalizar com pendência ============
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@mobiltec.com.br', senha: 'admin123' }),
  })
  token = login.corpo?.token
  if (!token) throw new Error(`Login pela API falhou: ${JSON.stringify(login)}`)

  const matriz = await api('/matriz?categoriaSlug=pos', {}, token)
  const exigeJust = ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA']
  const contarPendencias = (h) =>
    h.resultados.filter(
      (r) =>
        r.status === 'NAO_TESTADO' ||
        (exigeJust.includes(r.status) && !r.justificativaId && !r.justificativaTexto),
    ).length

  const alvo = matriz.corpo.colunas.find(
    (c) => c.homologacao.status === 'RASCUNHO' && contarPendencias(c.homologacao) > 0,
  )
  if (!alvo) throw new Error('Nenhuma coluna em rascunho com pendências para testar')
  const h = alvo.homologacao
  console.log(
    `4. Cobaia: ${h.dispositivo.nomeComercial} — ${contarPendencias(h)} pendência(s), status ${h.status}`,
  )

  const revisao = await api(
    `/homologacoes/${h.id}/status`,
    { method: 'POST', body: JSON.stringify({ novoStatus: 'EM_REVISAO' }) },
    token,
  )
  console.log(`5. RASCUNHO → EM_REVISAO com pendências: HTTP ${revisao.status}`)
  if (revisao.status !== 200) {
    erros.push(`A revisão ainda bloqueia: ${revisao.status} ${JSON.stringify(revisao.corpo)}`)
  }

  const aprovar = await api(
    `/homologacoes/${h.id}/status`,
    { method: 'POST', body: JSON.stringify({ novoStatus: 'APROVADO', homologado: false }) },
    token,
  )
  idFinalizada = aprovar.status === 200 ? h.id : null
  console.log(
    `6. EM_REVISAO → APROVADO: HTTP ${aprovar.status} | pendências devolvidas: ${aprovar.corpo?.pendencias?.length}`,
  )
  if (aprovar.status !== 200) {
    erros.push(`A aprovação ainda bloqueia: ${aprovar.status} ${JSON.stringify(aprovar.corpo)}`)
  }
  if (!aprovar.corpo?.pendencias?.length) {
    erros.push('A resposta deveria listar as pendências que ficaram para trás')
  }

  // ============ Parte 3: o modal avisa sem travar ============
  //
  // Outra coluna, não a cobaia: aquela acabou de ser aprovada e o menu dela
  // agora oferece "Reabrir". Esta parte precisa de uma ainda em rascunho e com
  // pendências, que é o caso que o modal tem de avisar sem travar.
  const paraOModal = matriz.corpo.colunas.find(
    (c) =>
      c.homologacao.id !== h.id &&
      c.homologacao.status === 'RASCUNHO' &&
      contarPendencias(c.homologacao) > 0,
  )
  if (!paraOModal) throw new Error('Nenhuma segunda coluna em rascunho com pendências')
  const nomeNoModal = paraOModal.homologacao.dispositivo.nomeComercial
  console.log(`6b. Coluna do modal: ${nomeNoModal} — ${contarPendencias(paraOModal.homologacao)} pendência(s)`)

  await p.reload({ waitUntil: 'networkidle' })
  // "Finalizar" deixou de ser botão solto no cabeçalho: mora no hambúrguer da
  // coluna do modelo. O primeiro `[data-menu-coluna]` do thead é o das seções
  // da planilha, que não tem essa ação — daí filtrar por `th[data-modelo]`.
  await p.waitForSelector('thead th[data-modelo] [data-menu-coluna]')
  await p
    .locator('thead th[data-modelo]')
    .filter({ hasText: nomeNoModal })
    .first()
    .locator('[data-menu-coluna]')
    .click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: 'Finalizar' }).click()
  await p.waitForSelector('[role=dialog]')
  const modal = await p.locator('[role=dialog]').evaluate((el) => ({
    texto: el.textContent,
    temAviso: !!el.querySelector('[data-pendencias]'),
    botoesTravados: [...el.querySelectorAll('button')]
      .filter((b) => /Homologado/.test(b.textContent))
      .map((b) => b.disabled),
  }))
  console.log(
    `7. Modal — avisa: ${modal.temAviso} | botões travados: ${JSON.stringify(modal.botoesTravados)}`,
  )
  if (modal.botoesTravados.some(Boolean)) erros.push('O modal voltou a desabilitar os botões')
  if (modal.temAviso && !/gerente de produto/.test(modal.texto)) {
    erros.push('O aviso deveria dizer de quem é a validação')
  }
  await p.screenshot({ path: `${SAIDA}/41-modal-finalizar.png` })
  await p.keyboard.press('Escape')
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-finalizar-livre.png` }).catch(() => {})
} finally {
  // Devolve a cobaia ao estado anterior e apaga o rastro do teste
  if (idFinalizada && token) {
    const volta = await api(
      `/homologacoes/${idFinalizada}/reabrir`,
      { method: 'POST', body: JSON.stringify({ motivo: 'Rollback do roteiro de verificação' }) },
      token,
    )
    const apagados = await prisma.logReabertura.deleteMany({
      where: { homologacaoId: idFinalizada, motivo: 'Rollback do roteiro de verificação' },
    })
    console.log(`8. Cobaia reaberta: HTTP ${volta.status} | logs de teste apagados: ${apagados.count}`)
    if (volta.status !== 200) erros.push('NÃO CONSEGUI REABRIR A COBAIA — confira no sistema')
  }
  await prisma.$disconnect()
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
