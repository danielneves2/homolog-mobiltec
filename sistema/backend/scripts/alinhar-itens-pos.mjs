/**
 * Alinha os itens de Telemetria aos nomes e à ordem definidos pelo usuário.
 *
 * **Não apaga nada.** Os dois itens fora da lista dele ("Histórico de Bateria"
 * e "Sinal de Rede (4G/Wi-Fi)") vão para o fim do grupo em vez de sair: cada
 * um já tem 32 resultados OK gravados, e um deles uma falha justificada.
 * Remover custaria 65 avaliações reais — decisão que não é minha.
 *
 * O script é idempotente: reconhece o item tanto pelo nome antigo quanto pelo
 * novo, então rodar duas vezes não faz diferença.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** [nome antigo, nome novo, ordem nova] */
const TELEMETRIA = [
  ['Nível de Bateria', 'Bateria', 1],
  ['Status de Memória RAM', 'Memória', 2],
  ['Consumo de Dados Móveis', 'Dados Móveis', 3],
  ['Status de Armazenamento', 'Armazenamento', 4],
  ['Última Localização', 'Última Localização', 5],
  ['Histórico de Localização', 'Histórico de Localização', 6],
  ['Aplicativos Instalados', 'Apps Instalados', 7],
  ['Tempo de Uso Apps', 'App Tempo/Tela', 8],
  ['Consumo WiFi por App', 'App Consumo WiFi', 9],
  ['Consumo 4G por Apps', 'App Consumo 4G', 10],
  // Fora da lista do usuário — no fim, aguardando decisão
  ['Histórico de Bateria', 'Histórico de Bateria', 11],
  ['Sinal de Rede (4G/Wi-Fi)', 'Sinal de Rede (4G/Wi-Fi)', 12],
]

const erros = []
let renomeados = 0
let reordenados = 0

for (const [antigo, novo, ordem] of TELEMETRIA) {
  const item = await prisma.itemTeste.findFirst({
    where: { grupo: 'TELEMETRIA', nome: { in: [antigo, novo] } },
  })
  if (!item) {
    erros.push(`Item não encontrado: "${antigo}"`)
    continue
  }
  if (item.nome !== novo) renomeados++
  if (item.ordem !== ordem) reordenados++
  await prisma.itemTeste.update({ where: { id: item.id }, data: { nome: novo, ordem } })
}

const depois = await prisma.itemTeste.findMany({
  where: { grupo: 'TELEMETRIA' },
  orderBy: { ordem: 'asc' },
  select: { ordem: true, nome: true },
})
console.log(`Renomeados: ${renomeados} | reordenados: ${reordenados}`)
console.table(depois)

// Nenhum item pode ter sumido nem duplicado a ordem
const ordens = depois.map((i) => i.ordem)
if (new Set(ordens).size !== ordens.length) erros.push(`Ordens repetidas: ${ordens.join(', ')}`)
if (depois.length !== TELEMETRIA.length) {
  erros.push(`Esperava ${TELEMETRIA.length} itens em Telemetria, achei ${depois.length}`)
}

await prisma.$disconnect()
console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
