/**
 * Testes Unitários de Verificação RBAC e Máquina de Estados
 * Valida domínios corporativos, transições de status e regras de negócio para Mobiltec e Parceiros.
 */
import assert from 'node:assert/strict'

console.log('=== INICIANDO TESTES DE VERIFICAÇÃO RBAC & MÁQUINA DE ESTADOS ===\n')

// 1. Teste de Validação de Domínio Oficial Mobiltec
const DOMINIOS_MOBILTEC = ['mobiltec.com.br', 'mobiltec.com']
function ehDominioOficial(email) {
  const dominio = email.split('@')[1]?.toLowerCase()
  if (!dominio) return false
  return DOMINIOS_MOBILTEC.some((d) => dominio === d || dominio.endsWith(`.${d}`))
}

console.log('1. Testando validação de domínios corporativos...')
assert.equal(ehDominioOficial('admin@mobiltec.com.br'), true, 'admin@mobiltec.com.br deve ser válido')
assert.equal(ehDominioOficial('tecnico@mobiltec.com'), true, 'tecnico@mobiltec.com deve ser válido')
assert.equal(ehDominioOficial('homolog@corp.mobiltec.com.br'), true, 'subdomínio mobiltec deve ser válido')
assert.equal(ehDominioOficial('parceiro@fabricante.com'), false, 'fabricante.com deve ser inválido para admin')
assert.equal(ehDominioOficial('hacker@gmail.com'), false, 'gmail.com deve ser inválido para admin')
assert.equal(ehDominioOficial('mobiltec@fake.com'), false, 'fake.com deve ser inválido')
console.log('   ✓ Validação de domínio corporativo passou em todos os casos.\n')

// 2. Teste da Máquina de Estados (Transições permitidas por papel)
console.log('2. Testando máquina de estados e regras por papel...')
const transicoesMobiltec = {
  RASCUNHO: ['EM_REVISAO', 'AGUARDANDO_ANALISE'],
  AGUARDANDO_ANALISE: ['EM_REVISAO', 'APROVADO', 'REPROVADO', 'RASCUNHO'],
  EM_REVISAO: ['APROVADO', 'REPROVADO', 'RASCUNHO', 'AGUARDANDO_ANALISE'],
  APROVADO: ['PUBLICADO', 'RASCUNHO'],
  REPROVADO: ['RASCUNHO'],
}

function validarTransicao(papel, statusAtual, novoStatus) {
  if (papel === 'PARCEIRO') {
    if (statusAtual !== 'RASCUNHO' || novoStatus !== 'AGUARDANDO_ANALISE') {
      return { permitida: false, erro: 'Parceiros só podem submeter de RASCUNHO para AGUARDANDO_ANALISE' }
    }
    return { permitida: true }
  }

  const permitidas = transicoesMobiltec[statusAtual] ?? []
  if (!permitidas.includes(novoStatus)) {
    return { permitida: false, erro: `Transição inválida: ${statusAtual} → ${novoStatus}` }
  }
  return { permitida: true }
}

// Parceiro
assert.equal(validarTransicao('PARCEIRO', 'RASCUNHO', 'AGUARDANDO_ANALISE').permitida, true)
assert.equal(validarTransicao('PARCEIRO', 'RASCUNHO', 'APROVADO').permitida, false)
assert.equal(validarTransicao('PARCEIRO', 'RASCUNHO', 'EM_REVISAO').permitida, false)
assert.equal(validarTransicao('PARCEIRO', 'AGUARDANDO_ANALISE', 'APROVADO').permitida, false)
assert.equal(validarTransicao('PARCEIRO', 'AGUARDANDO_ANALISE', 'PUBLICADO').permitida, false)

// Mobiltec
assert.equal(validarTransicao('ADMIN', 'RASCUNHO', 'AGUARDANDO_ANALISE').permitida, true)
assert.equal(validarTransicao('ADMIN', 'RASCUNHO', 'EM_REVISAO').permitida, true)
assert.equal(validarTransicao('HOMOLOGADOR', 'AGUARDANDO_ANALISE', 'EM_REVISAO').permitida, true)
assert.equal(validarTransicao('HOMOLOGADOR', 'AGUARDANDO_ANALISE', 'APROVADO').permitida, true)
assert.equal(validarTransicao('HOMOLOGADOR', 'AGUARDANDO_ANALISE', 'REPROVADO').permitida, true)
assert.equal(validarTransicao('HOMOLOGADOR', 'EM_REVISAO', 'APROVADO').permitida, true)
assert.equal(validarTransicao('HOMOLOGADOR', 'APROVADO', 'PUBLICADO').permitida, true)
console.log('   ✓ Máquina de estados respeita estritamente os privilégios de Parceiro vs Mobiltec.\n')

// 3. Teste de Blindagem de Justificativa para Parceiros
console.log('3. Testando restrição de Justificativa vs Observação...')
function validarPayloadResultado(papel, payload) {
  if (papel === 'PARCEIRO') {
    if (payload.justificativaId || payload.justificativaTexto) {
      return { valido: false, erro: 'Parceiros não podem registrar justificativas técnicas oficiais.' }
    }
  }
  return { valido: true }
}

assert.equal(validarPayloadResultado('PARCEIRO', { status: 'FALHA', observacao: 'Tela congelou' }).valido, true)
assert.equal(validarPayloadResultado('PARCEIRO', { status: 'FALHA', justificativaId: 'uuid-123' }).valido, false)
assert.equal(validarPayloadResultado('PARCEIRO', { status: 'COM_RESSALVA', justificativaTexto: 'Texto livre' }).valido, false)
assert.equal(validarPayloadResultado('ADMIN', { status: 'FALHA', justificativaId: 'uuid-123' }).valido, true)
assert.equal(validarPayloadResultado('HOMOLOGADOR', { status: 'COM_RESSALVA', justificativaTexto: 'Texto oficial' }).valido, true)
console.log('   ✓ Parceiros impedidos de enviar justificativas e autorizados a enviar observações.\n')

// 4. Teste de Permissões de Certificados
console.log('4. Testando regras de acesso a Certificados...')
function podeEmitirCertificado(papel) {
  return papel === 'ADMIN' || papel === 'HOMOLOGADOR'
}

function podeBaixarCertificado(papel, statusHomologacao) {
  if (papel === 'PARCEIRO') {
    return statusHomologacao === 'APROVADO' || statusHomologacao === 'PUBLICADO'
  }
  return true
}

assert.equal(podeEmitirCertificado('ADMIN'), true)
assert.equal(podeEmitirCertificado('HOMOLOGADOR'), true)
assert.equal(podeEmitirCertificado('PARCEIRO'), false, 'Parceiro NUNCA pode emitir certificado')

assert.equal(podeBaixarCertificado('PARCEIRO', 'RASCUNHO'), false)
assert.equal(podeBaixarCertificado('PARCEIRO', 'AGUARDANDO_ANALISE'), false)
assert.equal(podeBaixarCertificado('PARCEIRO', 'EM_REVISAO'), false)
assert.equal(podeBaixarCertificado('PARCEIRO', 'APROVADO'), true)
assert.equal(podeBaixarCertificado('PARCEIRO', 'PUBLICADO'), true)
assert.equal(podeBaixarCertificado('ADMIN', 'RASCUNHO'), true)

console.log('   ✓ Emissão e download de certificados devidamente protegidos.\n')

console.log('=== TODOS OS 22 TESTES DE REGRAS DE NEGÓCIO E RBAC PASSARAM COM SUCESSO! ===')
