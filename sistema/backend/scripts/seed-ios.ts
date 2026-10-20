/**
 * Bateria iOS (D502) — iPad e iPhone com os mesmos testes.
 *
 * Fonte: "Mapeamento Oficial de Funcionalidades iOS — Console Cloud4Mobile"
 * (Perfis > Novo Perfil > Apple), com a compatibilidade BYOD x Supervisionado
 * de cada funcionalidade.
 *
 * Estrutura da matriz:
 *  - Monitoramento e Informações: bateria, armazenamento e os campos da tela
 *    "Informações do dispositivo" da console.
 *  - Comandos Remotos e Variáveis: Desabilitar/Wipe, Modo Perdido, a
 *    localização dentro dele e as variáveis de dispositivo.
 *  - Configurações de Restrição (Apple): uma linha por tópico do perfil
 *    (Restrições, Aplicativo, Segurança…). As funcionalidades do tópico vão
 *    no "?" da linha. Tópico sem nenhuma funcionalidade BYOD é
 *    `somenteSupervisionado` e não entra em homologação BYOD.
 *  - Instalação de Aplicativos, Email e Wi-Fi: uma linha por funcionalidade.
 *
 * Idempotente: pode rodar de novo; itens são achados por grupo + nome.
 *
 *   npx tsx scripts/seed-ios.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Func = { nome: string; byod: boolean }
type ItemDef = { nome: string; descricao: string; funcionalidades?: Func[]; somenteSupervisionado?: boolean }

const S = true // compatível com BYOD
const N = false // só supervisionado

const REGRA =
  'Teste as funcionalidades listadas no "?". Divergência em todas: Falha. Em uma ou algumas: Com ressalva, descrevendo na observação.'

function topico(nome: string, funcs: [string, boolean][]): ItemDef {
  const funcionalidades = funcs.map(([n, byod]) => ({ nome: n, byod }))
  return {
    nome,
    descricao: REGRA,
    funcionalidades,
    somenteSupervisionado: funcionalidades.every((f) => !f.byod),
  }
}

/**
 * Funcionalidade solta. O "?" na matriz fica só nos tópicos de restrição e
 * onde o teste precisa de contexto (`comAjuda`, ex.: Solicitar Localização,
 * que só funciona dentro do Modo Perdido) — D505.
 */
function unica(nome: string, descricao: string, byod: boolean, comAjuda = false): ItemDef {
  return {
    nome,
    descricao,
    funcionalidades: comAjuda ? [{ nome: descricao, byod }] : [],
    somenteSupervisionado: !byod,
  }
}

const CAMPO_INFO = 'Campo exibido em Informações do dispositivo, na console.'

const GRUPOS: { chave: string; titulo: string; itens: ItemDef[] }[] = [
  {
    chave: 'IOS_MONITORAMENTO',
    titulo: 'Monitoramento e Informações',
    itens: [
      { nome: 'Bateria', descricao: 'Nível de bateria reportado na console.' },
      { nome: 'Armazenamento', descricao: 'Uso de armazenamento reportado na console.' },
      ...[
        'Fabricante',
        'Marca',
        'Modelo',
        'SKU',
        'Sistema Operacional',
        'Versão do SO',
        'UDID',
        'IMEI 1',
        'IMEI 2',
        'EID',
        'Número de Série',
        'Endereço MAC do Wi-Fi',
        'Nome da Rede Wi-Fi',
        'Endereço de IP',
        'Operadora',
        'Memória RAM',
        'Memória de Armazenamento',
        'Status de Gerenciamento',
      ].map((nome) => ({ nome, descricao: CAMPO_INFO })),
    ],
  },
  {
    chave: 'IOS_COMANDOS',
    titulo: 'Comandos Remotos e Variáveis',
    itens: [
      {
        nome: 'Desabilitar / Wipe',
        descricao: 'Desabilitar remove temporariamente a conexão com a console; Wipe formata o aparelho e restaura os padrões de fábrica.',
      },
      // Modo Perdido e a localização dentro dele só existem em iOS supervisionado (D506)
      unica('Modo Perdido', 'Trava o dispositivo na hora, impedindo o uso até a liberação na console.', N),
      unica('Solicitar Localização (em modo perdido)', 'Força o rastreamento e exibe a posição no mapa durante o Modo Perdido.', N, true),
      unica(
        'Variáveis',
        'Valor próprio de cada aparelho: a variável vai no perfil e cada aparelho mostra o seu valor (ex.: código do funcionário no e-mail).',
        S,
      ),
    ],
  },
  {
    chave: 'IOS_RESTRICOES',
    titulo: 'Configurações de Restrição (Apple)',
    itens: [
      topico('Configuração de Restrições', [
        ['Desabilitar Câmera', S],
        ['Desabilitar Captura de Tela', S],
        ['Desabilitar Discagem por Voz', S],
        ['Desabilitar Modificação do Nome do Dispositivo', N],
        ['Desabilitar Pareamento com Host', N],
        ['Desabilitar Pareamento com Apple Watch', N],
        ['Desabilitar Remoção de Apps do Sistema', N],
        ['Desabilitar Apagar Conteúdo e Configurações', N],
        ['Desabilitar Modificação do Papel de Parede', N],
      ]),
      topico('Configurações de Aplicativo', [
        ['Desabilitar App Clips', N],
        ['Desabilitar Instalação de Aplicativos', N],
        ['Desabilitar Download Automático de Aplicativos', N],
        ['Desabilitar Compra no Aplicativo', S],
        ['Desabilitar Continuidade de Atividade', S],
        ['Desabilitar Acesso a Unidade de Rede', S],
        ['Desabilitar Acesso a Unidade USB', S],
      ]),
      topico('Configurações de Segurança', [
        ['Desabilitar Touch ID para Desbloqueio', S],
        ['Desabilitar Modificação de Senha', N],
        ['Desabilitar Modificação de Conta', N],
        ['Desabilitar Preenchimento Automático de Senhas', N],
        ['Desabilitar Solicitação de Proximidade de Senhas', N],
        ['Desabilitar Compartilhamento de Senhas', N],
        ['Desabilitar Instalação de Perfis de Configuração pela Interface', N],
      ]),
      topico('Configurações de Rede', [
        ['Desabilitar AirDrop', N],
        ['Desabilitar Criação de VPN', N],
        ['Desabilitar Modificação do Bluetooth', N],
        ['Desabilitar Modificação do Plano Celular', N],
        ['Desabilitar Modificação do eSIM', N],
        ['Desabilitar Modificação do Ponto de Acesso Pessoal', N],
        ['Forçar Wi-Fi Ligado', N],
      ]),
      topico('Configurações de Nuvem', [
        ['Desabilitar Backup na Nuvem', N],
        ['Desabilitar Sincronização de Documentos na Nuvem', N],
        ['Desabilitar Biblioteca de Fotos na Nuvem', S],
        ['Desabilitar Sincronização de Apps Gerenciados na Nuvem', N],
      ]),
      topico('Configurações de Teclado', [
        ['Desabilitar Autocorreção', N],
        ['Desabilitar Atalhos de Teclado', N],
        ['Desabilitar Teclado Preditivo', N],
        ['Desabilitar Busca de Definições', N],
      ]),
      topico('Entretenimento e Jogos', [
        ['Desabilitar Game Center', N],
        ['Desabilitar Adicionar Amigos no Game Center', N],
        ['Desabilitar Jogos Multiplayer', N],
        ['Desabilitar Serviço de Música', N],
      ]),
      // Tópicos de uma funcionalidade só: o nome já diz o que testar, sem "?" (D507)
      unica('Restrições de Conteúdo', 'Desabilitar Conteúdo Explícito: bloqueia músicas, vídeos e podcasts com classificação para adultos.', S),
      topico('Atualização de Software', [
        ['Forçar Atualizações de Software Atrasadas', S],
        ['Atraso de atualização de software (dias)', N],
        ['Forçar Data e Hora Automáticas', N],
        ['Forçar Limitação de Rastreamento de Anúncios', N],
      ]),
      unica('Apps Open In', 'Apps permitidos para Open In: lista branca de Bundle IDs autorizados a trocar e abrir arquivos corporativos.', S),
    ],
  },
  {
    chave: 'IOS_APPS',
    titulo: 'Instalação de Aplicativos (Apple)',
    itens: [
      unica(
        'Instalação Silenciosa em Background',
        'Requer Supervisionado + ABM (VPP). Em BYOD ou sem ABM, o iOS sempre pede confirmação do usuário.',
        N,
      ),
      unica(
        'Seleção e Entrega de Apps do Repositório',
        'Distribuição de aplicativos aprovados (VPP ou in-house) cadastrados no repositório.',
        S,
      ),
      unica(
        'Distribuição via Apple VPP (ABM)',
        'Distribuição de licenças empresariais adquiridas no portal Apple Business Manager.',
        S,
      ),
      unica(
        'Remoção Remota de Apps Gerenciados',
        'Exclusão remota do aplicativo e dos seus dados corporativos ao desvincular.',
        S,
      ),
    ],
  },
  {
    chave: 'IOS_EMAIL',
    titulo: 'Configurações de Email (Apple)',
    itens: [
      unica('Dados da Conta (Nome, Descrição e E-mail)', 'Provisionamento remoto da conta corporativa no cliente nativo.', S),
      unica('Tipo de Conta (IMAP / Exchange / POP3)', 'Suporte a múltiplos protocolos de correio eletrônico.', S),
      unica('Desabilitar Mail Drop', 'Impede o envio de anexos pesados pela nuvem pública da Apple.', S),
      unica(
        'Desativar Sincronização de Endereços Recentes',
        'Evita cache e preenchimento de destinatários não corporativos.',
        S,
      ),
      unica('Enviar Utilizando Somente o Apple Mail', 'Restringe o envio de mensagens ao app oficial.', S),
      unica(
        'Servidores de Entrada e Saída (Host/Porta/SSL)',
        'Configuração remota com certificados e criptografia pré-definidos.',
        S,
      ),
    ],
  },
  {
    chave: 'IOS_WIFI',
    titulo: 'Configuração de Wi-Fi (Apple)',
    itens: [
      unica('Provisionamento de Rede (Nome e SSID)', 'Conexão transparente, sem divulgar a senha ao usuário.', S),
      unica(
        'Criptografia Pessoal e Corporativa (WPA3 / 802.1X)',
        'Suporte a redes WPA/WPA2/WPA3 e autenticação corporativa avançada (EAP).',
        S,
      ),
    ],
  },
]

/** Ficha do iOS: sem agente, com gerenciamento (BYOD/Supervisionado) e versão do iOS */
const CAMPOS_FICHA_IOS = ['fotoUrl', 'homologado', 'imei1', 'imei2', 'numeroSerie', 'gerenciamento', 'versaoSo', 'fabricante', 'modelo']

async function main() {
  const gruposOrdem = ['REGISTRO', ...GRUPOS.map((g) => g.chave)]
  const gruposTitulos = Object.fromEntries(GRUPOS.map((g) => [g.chave, g.titulo]))

  // 0. Renomeações já feitas na tela: o item em uso assume o nome novo e a
  //    cópia solta (sem bateria nem resultado) sai — nada se perde
  const RENOMEADOS: [string, string, string][] = [
    ['IOS_COMANDOS', 'Solicitar Localização', 'Solicitar Localização (em modo perdido)'],
  ]
  for (const [grupo, antigo, novo] of RENOMEADOS) {
    const velho = await prisma.itemTeste.findFirst({ where: { grupo, nome: antigo } })
    if (!velho) continue
    const copia = await prisma.itemTeste.findFirst({
      where: { grupo, nome: novo, bateriaItems: { none: {} }, resultados: { none: {} } },
    })
    if (copia) await prisma.itemTeste.delete({ where: { id: copia.id } })
    if (!(await prisma.itemTeste.findFirst({ where: { grupo, nome: novo } }))) {
      await prisma.itemTeste.update({ where: { id: velho.id }, data: { nome: novo } })
    }
  }

  // 1. Itens (achados por grupo + nome)
  const idsEmOrdem: string[] = []
  for (const g of GRUPOS) {
    let ordem = 0
    for (const def of g.itens) {
      ordem++
      const dados = {
        descricaoAcao: def.descricao,
        ordem,
        ativo: true,
        somenteSupervisionado: def.somenteSupervisionado ?? false,
        funcionalidades: def.funcionalidades ?? [],
      }
      const existente = await prisma.itemTeste.findFirst({ where: { grupo: g.chave, nome: def.nome } })
      const item = existente
        ? await prisma.itemTeste.update({ where: { id: existente.id }, data: dados })
        : await prisma.itemTeste.create({ data: { grupo: g.chave, nome: def.nome, ...dados } })
      idsEmOrdem.push(item.id)
    }
  }
  console.log(`itens: ${idsEmOrdem.length}`)

  // Itens iOS que saíram da definição (ex.: renomeados) e não estão em
  // nenhuma bateria nem têm resultado: saem do catálogo
  const orfaos = await prisma.itemTeste.findMany({
    where: {
      grupo: { in: GRUPOS.map((g) => g.chave) },
      id: { notIn: idsEmOrdem },
      bateriaItems: { none: {} },
      resultados: { none: {} },
    },
    select: { id: true, nome: true },
  })
  if (orfaos.length) {
    await prisma.itemTeste.deleteMany({ where: { id: { in: orfaos.map((o) => o.id) } } })
    console.log(`removidos do catálogo: ${orfaos.map((o) => o.nome).join(', ')}`)
  }

  // 2. Tipos: iPad (slug "ios", já existe) e iPhone
  const ipad = await prisma.categoria.findUnique({ where: { slug: 'ios' } })
  if (!ipad) throw new Error('Tipo iPad (slug "ios") não encontrado')
  const config = { plataforma: 'IOS', camposFicha: CAMPOS_FICHA_IOS, gruposOrdem, gruposTitulos, icone: 'apple' }

  await prisma.categoria.update({ where: { id: ipad.id }, data: { nome: 'iPad', ativo: true, ...config } })

  const iphone =
    (await prisma.categoria.findUnique({ where: { slug: 'iphone' } })) ??
    (await prisma.categoria.create({
      data: {
        nome: 'iPhone',
        slug: 'iphone',
        ordem: ipad.ordem,
        liberadaParceiros: ipad.liberadaParceiros,
        ...config,
      },
    }))
  await prisma.categoria.update({ where: { id: iphone.id }, data: { nome: 'iPhone', ativo: true, ...config } })

  // 3. Bateria de cada um: exatamente os itens acima, na ordem
  for (const cat of [
    { id: ipad.id, nome: 'iPad' },
    { id: iphone.id, nome: 'iPhone' },
  ]) {
    const bateria =
      (await prisma.bateriaTeste.findFirst({ where: { categoriaId: cat.id }, orderBy: { nome: 'asc' } })) ??
      (await prisma.bateriaTeste.create({
        data: { categoriaId: cat.id, nome: `${cat.nome} — Padrão`, descricao: 'Bateria iOS (perfis Apple da console C4M).' },
      }))
    const emUso = await prisma.homologacao.count({ where: { bateriaId: bateria.id } })
    if (emUso > 0) {
      console.log(`${cat.nome}: bateria já tem ${emUso} homologação(ões) — itens não substituídos`)
      continue
    }
    await prisma.bateriaItem.deleteMany({ where: { bateriaId: bateria.id } })
    await prisma.bateriaItem.createMany({
      data: idsEmOrdem.map((itemId, i) => ({ bateriaId: bateria.id, itemId, ordem: i + 1 })),
    })
    console.log(`${cat.nome}: bateria com ${idsEmOrdem.length} itens`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
