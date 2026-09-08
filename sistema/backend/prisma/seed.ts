/**
 * Seed do banco de dados
 * Popula: categorias, usuário admin, 48 itens de teste (catálogo PoS),
 * bateria "PoS — Completa", 4 justificativas da biblioteca inicial
 */
import { PrismaClient, GrupoItem, TipoGerenciamento, PapelUsuario } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ============================================================
  // CATEGORIAS
  // ============================================================
  /**
   * As três primeiras são as linhas que a operação homologa hoje e formam o
   * menu. As outras ficam inativas: somem da navegação sem perder histórico.
   */
  const CATEGORIAS = [
    { slug: 'pos', nome: 'Terminal PoS', icone: 'credit-card', ordem: 1, ativo: true },
    { slug: 'impressora-termica', nome: 'Impressora Térmica', icone: 'printer', ordem: 2, ativo: true },
    { slug: 'coletor', nome: 'Coletor de Dados', icone: 'scan-barcode', ordem: 3, ativo: true },
    { slug: 'smartphone', nome: 'Smartphone', icone: 'smartphone', ordem: 10, ativo: false },
    { slug: 'tablet', nome: 'Tablet', icone: 'tablet', ordem: 11, ativo: false },
    { slug: 'ios', nome: 'iOS', icone: 'apple', ordem: 12, ativo: false },
  ]

  // `update` preenchido de propósito: renomear ou reativar uma categoria tem
  // de valer também em banco que já existe, não só em base nova.
  const categorias = await Promise.all(
    CATEGORIAS.map(c =>
      prisma.categoria.upsert({ where: { slug: c.slug }, update: c, create: c }),
    ),
  )
  const catPos = categorias[0]
  console.log('✅ Categorias criadas:', categorias.map(c => c.nome).join(', '))

  // ============================================================
  // USUÁRIO ADMIN PADRÃO
  // ============================================================
  const senhaHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@mobiltec.com.br' },
    // `nome` no update: o responsável técnico assina o certificado, então
    // trocar quem é a pessoa tem de valer em banco que já existe.
    update: { nome: 'Daniel Neves Lima' },
    create: {
      nome: 'Daniel Neves Lima',
      email: 'admin@mobiltec.com.br',
      cargo: 'Responsável Técnico',
      senhaHash,
      papel: PapelUsuario.ADMIN,
      empresa: 'Mobiltec',
    },
  })
  console.log('✅ Usuário admin criado:', admin.email)

  // ============================================================
  // USUÁRIO PARCEIRO PADRÃO
  // ============================================================
  // NOTA: Em produção, cada conta terá hash próprio gerado no momento do cadastro.
  // O hash compartilhado ('admin123') é utilizado estritamente no seed de demonstração/testes locais.
  const parceiro = await prisma.usuario.upsert({
    where: { email: 'parceiro@fabricante.com' },
    update: { nome: 'Carlos Silva (Parceiro)' },
    create: {
      nome: 'Carlos Silva (Parceiro)',
      email: 'parceiro@fabricante.com',
      cargo: 'Engenheiro de Testes',
      empresa: 'Fabricante Global',
      senhaHash,
      papel: PapelUsuario.PARCEIRO,
    },
  })
  console.log('✅ Usuário parceiro criado:', parceiro.email)

  // ============================================================
  // CATÁLOGO DE 48 ITENS DE TESTE — seed PoS (spec §6)
  // ============================================================

  const itens: Array<{
    grupo: GrupoItem
    nome: string
    descricaoAcao: string
    ordem: number
  }> = [
    // TELEMETRIA — nomes e ordem definidos pelo usuário.
    //
    // Os dois últimos ("Histórico de Bateria" e "Sinal de Rede") não estão na
    // lista dele, e ficam no fim à espera de decisão: já carregam 65
    // avaliações reais (32 OK cada, mais uma falha justificada), então apagar
    // não é reversível. Ver DECISOES, Etapa 42.
    { grupo: GrupoItem.TELEMETRIA, nome: 'Bateria', descricaoAcao: 'Leitura em tempo real via console', ordem: 1 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Memória', descricaoAcao: 'Leitura em tempo real via console', ordem: 2 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Dados Móveis', descricaoAcao: 'Validação do volume de dados trafegados', ordem: 3 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Armazenamento', descricaoAcao: 'Verificação de espaço livre/ocupado', ordem: 4 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Última Localização', descricaoAcao: 'Verificação do último ponto GPS', ordem: 5 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Histórico de Localização', descricaoAcao: 'Verificação do histórico de GPS', ordem: 6 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Apps Instalados', descricaoAcao: 'Validação aplicativos sistema e instalados', ordem: 7 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'App Tempo/Tela', descricaoAcao: 'Validação do tempo por aplicativo', ordem: 8 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'App Consumo WiFi', descricaoAcao: 'Validação do consumo wifi por aplicativo', ordem: 9 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'App Consumo 4G', descricaoAcao: 'Validação do consumo 4G por aplicativo', ordem: 10 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Histórico de Bateria', descricaoAcao: 'Verificação do histórico de bateria', ordem: 11 },
    { grupo: GrupoItem.TELEMETRIA, nome: 'Sinal de Rede (4G/Wi-Fi)', descricaoAcao: 'Leitura do tipo de conexão e qualidade', ordem: 12 },

    // COLETA (11 itens)
    { grupo: GrupoItem.COLETA, nome: 'IMEI 1', descricaoAcao: 'Identificação única do primeiro slot', ordem: 1 },
    { grupo: GrupoItem.COLETA, nome: 'IMEI 2', descricaoAcao: 'Identificação única do segundo slot', ordem: 2 },
    { grupo: GrupoItem.COLETA, nome: 'Número de Série', descricaoAcao: 'Validação da identidade do fabricante', ordem: 3 },
    { grupo: GrupoItem.COLETA, nome: 'Rede WiFi', descricaoAcao: 'Identificação do nome rede sem-fio', ordem: 4 },
    { grupo: GrupoItem.COLETA, nome: 'Endereço IP', descricaoAcao: 'Verificação do protocolo internet ativo', ordem: 5 },
    { grupo: GrupoItem.COLETA, nome: 'Operadora', descricaoAcao: 'Identificação da rede móvel utilizada', ordem: 6 },
    { grupo: GrupoItem.COLETA, nome: 'Fabricante', descricaoAcao: 'Confirmação da marca do terminal', ordem: 7 },
    { grupo: GrupoItem.COLETA, nome: 'Modelo', descricaoAcao: 'Validação da versão comercial terminal', ordem: 8 },
    { grupo: GrupoItem.COLETA, nome: 'Precisão GPS', descricaoAcao: 'Verificação da margem da localização', ordem: 9 },
    { grupo: GrupoItem.COLETA, nome: 'Saúde da Bateria', descricaoAcao: 'Diagnóstico da vida útil bateria', ordem: 10 },
    { grupo: GrupoItem.COLETA, nome: 'SIM Card', descricaoAcao: 'Verificação do status chip físico', ordem: 11 },

    // COMANDOS (16 itens)
    { grupo: GrupoItem.COMANDOS, nome: 'Desabilitar / Habilitar', descricaoAcao: 'Gestão da conectividade via console', ordem: 1 },
    { grupo: GrupoItem.COMANDOS, nome: 'Alarme', descricaoAcao: 'Disparo de sinal sonoro local', ordem: 2 },
    { grupo: GrupoItem.COMANDOS, nome: 'Reiniciar', descricaoAcao: 'Execução de reboot via console', ordem: 3 },
    { grupo: GrupoItem.COMANDOS, nome: 'Bloquear', descricaoAcao: 'Aplicação remota de senha segurança', ordem: 4 },
    { grupo: GrupoItem.COMANDOS, nome: 'Desbloquear', descricaoAcao: 'Liberação remota da tela bloqueada', ordem: 5 },
    { grupo: GrupoItem.COMANDOS, nome: 'Wipe', descricaoAcao: 'Restauração total padrões fábrica', ordem: 6 },
    { grupo: GrupoItem.COMANDOS, nome: 'Requisitar Logs', descricaoAcao: 'Upload automático registros técnicos', ordem: 7 },
    { grupo: GrupoItem.COMANDOS, nome: 'Visualização Remota', descricaoAcao: 'Transmissão da tela do dispositivo', ordem: 8 },
    { grupo: GrupoItem.COMANDOS, nome: 'Acesso Remoto', descricaoAcao: 'Interação remota com o dispositivo', ordem: 9 },
    { grupo: GrupoItem.COMANDOS, nome: 'Instalação', descricaoAcao: 'Envio de nova aplicação via console', ordem: 10 },
    { grupo: GrupoItem.COMANDOS, nome: 'Desinstalação', descricaoAcao: 'Remoção de aplicativos do sistema', ordem: 11 },
    { grupo: GrupoItem.COMANDOS, nome: 'Limpeza de Dados', descricaoAcao: 'Limpeza dos dados do aplicativo', ordem: 12 },
    { grupo: GrupoItem.COMANDOS, nome: 'Instalação Silenciosa', descricaoAcao: 'Instalação em background sem intervenção', ordem: 13 },
    { grupo: GrupoItem.COMANDOS, nome: 'Instalação Automática', descricaoAcao: 'Instalação sem intervenção do Usuário', ordem: 14 },
    { grupo: GrupoItem.COMANDOS, nome: 'Requisito de Instalação', descricaoAcao: 'Validação da compatibilidade técnica', ordem: 15 },
    { grupo: GrupoItem.COMANDOS, nome: 'Mensagem', descricaoAcao: 'Envio de aviso de texto direto', ordem: 16 },

    // PERFIS (9 itens)
    { grupo: GrupoItem.PERFIS, nome: 'Configuração de Monitores', descricaoAcao: 'Supervisão centralizada de hardware', ordem: 1 },
    { grupo: GrupoItem.PERFIS, nome: 'Políticas de Senhas', descricaoAcao: 'Exigência de senha definida pela console', ordem: 2 },
    { grupo: GrupoItem.PERFIS, nome: 'Configuração de Launcher', descricaoAcao: 'Sobreposição da interface sobre o sistema', ordem: 3 },
    { grupo: GrupoItem.PERFIS, nome: 'Time Fencing', descricaoAcao: 'Acesso aos aplicativos por horário definido', ordem: 4 },
    { grupo: GrupoItem.PERFIS, nome: 'Apps Bloqueados', descricaoAcao: 'Bloqueio ferramentas não autorizadas', ordem: 5 },
    { grupo: GrupoItem.PERFIS, nome: 'Instalação de Apps', descricaoAcao: 'Gestão para downloads de aplicativos', ordem: 6 },
    { grupo: GrupoItem.PERFIS, nome: 'Instalação de Conteúdo', descricaoAcao: 'Distribuição remota de arquivos', ordem: 7 },
    { grupo: GrupoItem.PERFIS, nome: 'APN Automática', descricaoAcao: 'Configuração dos dados móveis', ordem: 8 },
    { grupo: GrupoItem.PERFIS, nome: 'Zero-Touch', descricaoAcao: 'Ativação automática no primeiro acesso', ordem: 9 },
  ]

  // Cria ou atualiza cada item — usa nome+grupo como chave natural
  const itensCriados = []
  for (const item of itens) {
    const criado = await prisma.itemTeste.upsert({
      where: {
        // Não há unique no Prisma para (grupo, nome), então usamos findFirst + create/update manual
        // Usamos um workaround com id estável via nome determinístico
        id: deterministicId(item.grupo, item.nome),
      },
      update: { descricaoAcao: item.descricaoAcao, ordem: item.ordem },
      create: {
        id: deterministicId(item.grupo, item.nome),
        grupo: item.grupo,
        nome: item.nome,
        descricaoAcao: item.descricaoAcao,
        ordem: item.ordem,
        ativo: true,
      },
    })
    itensCriados.push(criado)
  }
  console.log(`✅ ${itensCriados.length} itens de teste criados`)

  // ============================================================
  // BATERIA "PoS — Completa" com todos os 48 itens
  // ============================================================
  const bateriaPosId = deterministicId('bateria', 'pos-completa')
  const bateriaPos = await prisma.bateriaTeste.upsert({
    where: { id: bateriaPosId },
    update: {},
    create: {
      id: bateriaPosId,
      categoriaId: catPos.id,
      nome: 'PoS — Completa',
      descricao: 'Bateria completa de homologação para terminais PoS. Inclui todos os 48 itens do catálogo.',
      ativo: true,
    },
  })

  // Cria as relações bateria_item
  for (const item of itensCriados) {
    await prisma.bateriaItem.upsert({
      where: { bateriaId_itemId: { bateriaId: bateriaPos.id, itemId: item.id } },
      update: {},
      create: {
        bateriaId: bateriaPos.id,
        itemId: item.id,
        ordem: item.ordem,
        obrigatorio: true,
      },
    })
  }
  console.log('✅ Bateria "PoS — Completa" criada com', itensCriados.length, 'itens')

  // ============================================================
  // BATERIA PADRÃO DAS DEMAIS CATEGORIAS ATIVAS
  // ============================================================
  // Os 48 itens são de agente MDM em Android — valem igual para impressora
  // térmica e coletor. Sem uma bateria a categoria abre no sistema mas não
  // deixa cadastrar modelo nenhum, então nasceria morta.
  for (const cat of categorias.filter(c => c.ativo && c.slug !== 'pos')) {
    const id = deterministicId('bateria', `${cat.slug}-completa`)
    await prisma.bateriaTeste.upsert({
      where: { id },
      update: { nome: `${cat.nome} — Completa`, ativo: true },
      create: {
        id,
        categoriaId: cat.id,
        nome: `${cat.nome} — Completa`,
        descricao: `Bateria completa de homologação para ${cat.nome.toLowerCase()}. Mesmos ${itensCriados.length} itens do catálogo de agente Android.`,
        ativo: true,
      },
    })
    for (const item of itensCriados) {
      await prisma.bateriaItem.upsert({
        where: { bateriaId_itemId: { bateriaId: id, itemId: item.id } },
        update: {},
        create: { bateriaId: id, itemId: item.id, ordem: item.ordem, obrigatorio: true },
      })
    }
    console.log(`✅ Bateria "${cat.nome} — Completa" criada`)
  }

  // ============================================================
  // JUSTIFICATIVAS — biblioteca inicial (spec §9)
  // ============================================================

  // Busca IDs dos itens para itens_sugeridos
  const itemReiniciar = itensCriados.find(i => i.nome === 'Reiniciar')
  const itemBloquear = itensCriados.find(i => i.nome === 'Bloquear')
  const itemDesbloquear = itensCriados.find(i => i.nome === 'Desbloquear')
  const itemRedeWifi = itensCriados.find(i => i.nome === 'Rede WiFi')
  const itemPoliticasSenhas = itensCriados.find(i => i.nome === 'Políticas de Senhas')
  const itemAppsBloqueados = itensCriados.find(i => i.nome === 'Apps Bloqueados')

  const justificativas = [
    {
      id: deterministicId('justificativa', 'device-admin'),
      titulo: 'Device Admin depreciado — comandos de tela',
      texto: 'Funcionalidade não suportada pelo agente legado C4M em Android 7+ ou superior, devido à depreciação do modelo Device Admin para uso corporativo. Para execução do comando, é necessário suporte específico do fabricante via SDK ou implementação dedicada.',
      fontes: [{ label: 'Android Enterprise — Device Admin Deprecation', url: '' }],
      itensSugeridos: [itemReiniciar?.id, itemBloquear?.id, itemDesbloquear?.id].filter(Boolean) as string[],
      androidMin: 7,
      gerenciamento: TipoGerenciamento.ANDROID_LEGADO,
    },
    {
      id: deterministicId('justificativa', 'ssid-android9'),
      titulo: 'SSID como informação sensível — Android 9+',
      texto: 'Em versões Android 9 ou superior, o SSID da rede Wi-Fi é tratado como informação sensível, pois pode indicar a localização do usuário. Dessa forma, a identificação do nome da rede depende das permissões concedidas ao agente e das configurações do dispositivo. Caso a informação não seja coletada no cenário homologado, será necessário suporte específico do fabricante via SDK ou implementação dedicada.',
      fontes: [{ label: 'Android 9 — Visão geral da verificação de Wi-Fi', url: '' }],
      itensSugeridos: [itemRedeWifi?.id].filter(Boolean) as string[],
      androidMin: 9,
      gerenciamento: null,
    },
    {
      id: deterministicId('justificativa', 'politicas-senha'),
      titulo: 'Políticas de senha limitadas — Android 9+',
      texto: 'Políticas de senha podem ser limitadas no agente legado C4M em Android 9+, devido à depreciação do modelo Device Admin para uso corporativo. Para aplicação completa, é necessário suporte do fabricante via SDK ou implementação dedicada.',
      fontes: [],
      itensSugeridos: [itemPoliticasSenhas?.id].filter(Boolean) as string[],
      androidMin: 9,
      gerenciamento: TipoGerenciamento.ANDROID_LEGADO,
    },
    {
      id: deterministicId('justificativa', 'apps-bloqueados'),
      titulo: 'Apps Bloqueados — desinstalação em vez de bloqueio',
      texto: 'Funcionalidade com ressalva: o agente legado C4M não bloqueia a aplicação, realiza a desinstalação do app no dispositivo.',
      fontes: [],
      itensSugeridos: [itemAppsBloqueados?.id].filter(Boolean) as string[],
      androidMin: null,
      gerenciamento: TipoGerenciamento.ANDROID_LEGADO,
    },
  ]

  for (const just of justificativas) {
    await prisma.justificativa.upsert({
      where: { id: just.id },
      update: {},
      create: {
        id: just.id,
        titulo: just.titulo,
        texto: just.texto,
        fontes: just.fontes,
        itensSugeridos: just.itensSugeridos,
        androidMin: just.androidMin,
        gerenciamento: just.gerenciamento ?? undefined,
        usoCount: 0,
        ativo: true,
      },
    })
  }
  console.log(`✅ ${justificativas.length} justificativas criadas`)

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('   Login admin: admin@mobiltec.com.br / admin123')
}

/**
 * Gera um UUID v5 (RFC 4122) estável a partir de namespace + nome.
 * Garante que o seed seja idempotente sem precisar de unique composto no schema.
 * Precisa ser um UUID *válido*: as rotas validam os ids com `z.string().uuid()`.
 */
const NAMESPACE_SEED = '6f9d1b4e-1c2a-4f7d-9a3b-5e8c0d2f7a11'

function deterministicId(...partes: string[]): string {
  const nome = ['HOMOLOG_SEED', ...partes].join('::')
  const nsBytes = Buffer.from(NAMESPACE_SEED.replace(/-/g, ''), 'hex')
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(nome, 'utf8')])).digest()

  const bytes = hash.subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50 // versão 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122

  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
