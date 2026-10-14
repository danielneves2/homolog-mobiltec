import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LogoMobiltec } from '@/componentes/LogoMobiltec'
import { Icone, type NomeIcone } from '@/componentes/Icone'
import { META_STATUS } from '@/lib/tipos'

/**
 * Guia de uso (D491, D494).
 *
 * Central de ajuda no formato de documentação: categorias e artigos à
 * esquerda, um artigo por vez ao centro e, à direita, o índice da página,
 * ações e artigos relacionados. O artigo aberto fica no endereço (#id), então
 * "Copiar link" leva direto a ele.
 *
 * Os nomes de botões aqui são os da tela, ao pé da letra. Mudou um rótulo no
 * sistema? Mude aqui também.
 */

const ATUALIZADO_EM = '14 out 2026'

interface Secao {
  id: string
  titulo: string
  conteudo: ReactNode
}

interface Artigo {
  id: string
  categoria: string
  titulo: string
  resumo: string
  destaque: ReactNode
  tags: string[]
  leitura: number
  secoes: Secao[]
  relacionados: string[]
}

interface Categoria {
  id: string
  titulo: string
  icone: NomeIcone
  descricao: string
}

const CATEGORIAS: Categoria[] = [
  { id: 'inicio', titulo: 'Primeiros passos', icone: 'home', descricao: 'Onde você está e como a plataforma se organiza.' },
  { id: 'matriz', titulo: 'Matriz de testes', icone: 'homologacao', descricao: 'Cadastrar modelos e registrar os testes.' },
  { id: 'validacao', titulo: 'Validação', icone: 'upload', descricao: 'O caminho até a aprovação da Mobiltec.' },
  { id: 'certificado', titulo: 'Certificado', icone: 'certificado', descricao: 'Baixar o certificado e abrir retestes.' },
  { id: 'ajuda', titulo: 'Ajuda', icone: 'guia', descricao: 'Respostas rápidas para as dúvidas comuns.' },
]

// ============================================================
// Conteúdo
// ============================================================

const ARTIGOS: Artigo[] = [
  {
    id: 'onde-voce-esta',
    categoria: 'inicio',
    titulo: 'Onde você está',
    resumo: 'A plataforma de homologação reúne em um só lugar os testes de cada dispositivo, a validação técnica da Mobiltec e o certificado.',
    destaque: (
      <>
        Você testa os dispositivos da sua empresa contra o MDM da Mobiltec. A Mobiltec confere, valida e emite o{' '}
        <strong>certificado de homologação</strong>.
      </>
    ),
    tags: ['início', 'menu', 'visão geral'],
    leitura: 2,
    relacionados: ['paineis', 'matriz', 'caminho'],
    secoes: [
      {
        id: 'para-que-serve',
        titulo: 'Para que serve',
        conteudo: (
          <>
            <p>
              Cada dispositivo passa por uma bateria de testes. Você registra o que observou, a Mobiltec analisa e, com
              tudo certo, o dispositivo vira <Chip tipo="ok">Homologado</Chip> e ganha o certificado oficial.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Papel n={1} titulo="Você" texto="Cadastra o modelo e registra os testes." />
              <Papel n={2} titulo="Mobiltec" texto="Confere, pede ajustes se preciso e valida." />
              <Papel n={3} titulo="Certificado" texto="Liberado para download após a aprovação." />
            </div>
          </>
        ),
      },
      {
        id: 'como-a-tela-se-organiza',
        titulo: 'Como a tela se organiza',
        conteudo: (
          <ul className="space-y-2.5">
            <Check>
              <strong>Menu lateral:</strong> <Rotulo>Painéis</Rotulo> para consultar, <Rotulo>Matriz de testes</Rotulo>{' '}
              para trabalhar e <Rotulo>Guia de uso</Rotulo> para voltar aqui.
            </Check>
            <Check>
              <strong>Barra do topo:</strong> mostra onde você está, o sino{' '}
              <Icone nome="sino" className="inline h-3.5 w-3.5 align-[-2px]" /> de avisos e a sua empresa.
            </Check>
            <Check>
              <strong>Menu recolhido:</strong> passe o mouse sobre um ícone para ver as opções dele.
            </Check>
          </ul>
        ),
      },
      {
        id: 'por-onde-comecar',
        titulo: 'Por onde começar',
        conteudo: (
          <Passos>
            <PassoItem>Conheça os <LinkArtigo id="paineis">painéis</LinkArtigo> e o que cada um mostra.</PassoItem>
            <PassoItem>Abra a <LinkArtigo id="matriz">matriz de testes</LinkArtigo> do seu tipo de dispositivo.</PassoItem>
            <PassoItem><LinkArtigo id="cadastrar">Cadastre o primeiro modelo</LinkArtigo> e comece a testar.</PassoItem>
          </Passos>
        ),
      },
    ],
  },
  {
    id: 'paineis',
    categoria: 'inicio',
    titulo: 'Os painéis',
    resumo: 'Dois painéis, dois papéis: o da Mobiltec é a vitrine oficial; o da sua empresa é onde você acompanha o seu trabalho.',
    destaque: (
      <>
        No menu, em <Rotulo>Painéis</Rotulo>, ficam o <strong>Painel Mobiltec</strong> e o{' '}
        <strong>painel da sua empresa</strong>. Os dois são para consulta: o trabalho é feito na matriz de testes.
      </>
    ),
    tags: ['painel', 'mobiltec', 'empresa'],
    leitura: 3,
    relacionados: ['onde-voce-esta', 'certificado', 'revisao'],
    secoes: [
      {
        id: 'painel-mobiltec',
        titulo: 'Painel Mobiltec',
        conteudo: (
          <>
            <p>
              É o painel <strong>oficial</strong> da plataforma. Todo dispositivo aprovado pela Mobiltec aparece aqui,
              de qualquer empresa, junto com o que a própria Mobiltec está testando.
            </p>
            <ul className="mt-3 space-y-2.5">
              <Check>
                As abas <Rotulo>Homologados</Rotulo>, <Rotulo>Em homologação</Rotulo> e <Rotulo>Revalidados</Rotulo>{' '}
                separam os modelos; a busca encontra por modelo, versão ou fabricante.
              </Check>
              <Check>
                Em cada homologado, <Botao>Exibir informações</Botao> abre a ficha completa, com o resultado dos testes.
              </Check>
            </ul>
            <Dica>Os seus dispositivos entram como homologados aqui só depois da aprovação da Mobiltec.</Dica>
          </>
        ),
      },
      {
        id: 'painel-da-empresa',
        titulo: 'Painel da sua empresa',
        conteudo: (
          <>
            <p>
              O seu espaço de acompanhamento: os dispositivos da sua empresa e a etapa de cada um. Os filtros separam por
              situação:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tipo="neutro">Todos os dispositivos</Chip>
              <Chip tipo="rascunho">Em homologação</Chip>
              <Chip tipo="validacao">Em validação</Chip>
              <Chip tipo="revisao">Em revisão</Chip>
              <Chip tipo="ok">Homologados</Chip>
            </div>
            <ul className="mt-4 space-y-2.5">
              <Check>Cada card mostra o percentual de testes executados.</Check>
              <Check>
                <Botao>Matriz de testes →</Botao> leva direto à matriz do dispositivo; depois da aprovação aparece{' '}
                <Botao>Certificado</Botao>.
              </Check>
              <Check>
                Quando a Mobiltec pede ajustes, o painel avisa no topo com <Botao>Ver pendências</Botao>.
              </Check>
            </ul>
          </>
        ),
      },
      {
        id: 'qual-usar',
        titulo: 'Qual usar quando',
        conteudo: (
          <div className="grid gap-2">
            <Escolha pergunta="Quero ver o que já está homologado na plataforma" resposta="Painel Mobiltec" />
            <Escolha pergunta="Quero acompanhar os meus dispositivos" resposta="Painel da sua empresa" />
            <Escolha pergunta="Quero registrar testes" resposta="Matriz de testes" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'matriz',
    categoria: 'matriz',
    titulo: 'A matriz de testes',
    resumo: 'É onde o trabalho acontece: cada coluna é um modelo e cada linha, um item de teste.',
    destaque: (
      <>
        No menu, abra <Rotulo>Matriz de testes</Rotulo> e escolha o tipo de dispositivo. Você vê só os tipos liberados
        para a sua empresa.
      </>
    ),
    tags: ['matriz', 'colunas', 'filtros'],
    leitura: 2,
    relacionados: ['cadastrar', 'testar', 'onde-voce-esta'],
    secoes: [
      {
        id: 'como-se-organiza',
        titulo: 'Como ela se organiza',
        conteudo: (
          <ul className="space-y-2.5">
            <Check>
              <strong>Cada coluna é um modelo.</strong> O ícone ☰ ao lado do nome abre o menu do modelo.
            </Check>
            <Check>
              <strong>No topo fica a ficha</strong> da unidade testada: foto, IMEI, versões e afins.
            </Check>
            <Check>
              <strong>Abaixo vêm os testes</strong>, agrupados por tema (Telemetria, Coleta de Informações…).
            </Check>
          </ul>
        ),
      },
      {
        id: 'filtros',
        titulo: 'Filtros e atalhos',
        conteudo: (
          <>
            <p>
              Quando a matriz cresce, use os filtros <Rotulo>Fabricante</Rotulo>, <Rotulo>Modelo</Rotulo>,{' '}
              <Rotulo>Versão do agente</Rotulo> e <Rotulo>Status</Rotulo>. O contador ◆ mostra quantas divergências
              (falhas, não suportados e ressalvas) existem, e <Rotulo>Revalidados</Rotulo> mostra só os modelos que
              passaram por reteste.
            </p>
            <Dica>A matriz da sua empresa é só sua: outros parceiros não veem os seus modelos.</Dica>
          </>
        ),
      },
    ],
  },
  {
    id: 'cadastrar',
    categoria: 'matriz',
    titulo: 'Cadastrar um modelo',
    resumo: 'Cada modelo novo vira uma coluna na matriz, com todos os testes prontos para começar.',
    destaque: (
      <>
        Na matriz, <Botao destaque>+ Novo modelo</Botao> abre o cadastro. Ao salvar, a coluna nasce com todos os itens em{' '}
        <em>Não testado</em>.
      </>
    ),
    tags: ['modelo', 'cadastro', 'coluna'],
    leitura: 2,
    relacionados: ['testar', 'matriz', 'reteste'],
    secoes: [
      {
        id: 'cadastrar-passos',
        titulo: 'Cadastrar o modelo',
        conteudo: (
          <Passos>
            <PassoItem>
              Na matriz, clique em <Botao destaque>+ Novo modelo</Botao>.
            </PassoItem>
            <PassoItem>
              Preencha <strong>Fabricante</strong>, <strong>Modelo</strong>, o sistema e a versão,{' '}
              <strong>Tipo de agente</strong>, <strong>Versão do agente</strong> e <strong>Método de inscrição</strong>.
            </PassoItem>
            <PassoItem>
              Se tiver em mãos, inclua número de série e IMEIs. Depois clique em{' '}
              <Botao destaque>Cadastrar modelo</Botao>.
            </PassoItem>
          </Passos>
        ),
      },
      {
        id: 'corrigir',
        titulo: 'Corrigir um dado depois',
        conteudo: (
          <p>
            Pelo menu ☰ da coluna → <Rotulo>Configuração</Rotulo> você corrige o cadastro enquanto o modelo estiver em
            homologação ou em revisão. Cadastrou por engano? <Rotulo>Remover da planilha</Rotulo>, no mesmo menu, apaga a
            coluna (só para quem a cadastrou e antes da finalização).
          </p>
        ),
      },
    ],
  },
  {
    id: 'testar',
    categoria: 'matriz',
    titulo: 'Registrar os testes',
    resumo: 'Marque o resultado de cada item, anote o que observou e mantenha a ficha da unidade em dia.',
    destaque: <>Tudo é salvo na hora, sem botão de salvar.</>,
    tags: ['resultado', 'observação', 'anexo', 'ficha'],
    leitura: 3,
    relacionados: ['cadastrar', 'caminho', 'enviar'],
    secoes: [
      {
        id: 'marcar-resultado',
        titulo: 'Marcar o resultado',
        conteudo: (
          <>
            <p>Clique na célula do item e escolha o resultado. Atalho: tecle o número.</p>
            <div className="mt-3 grid gap-2">
              {(Object.keys(META_STATUS) as (keyof typeof META_STATUS)[]).map((st) => (
                <Resultado key={st} meta={META_STATUS[st]} />
              ))}
            </div>
          </>
        ),
      },
      {
        id: 'observacoes',
        titulo: 'Registrar observações',
        conteudo: (
          <>
            <ul className="space-y-2.5">
              <Check>
                <strong>Por item:</strong> na célula, <Rotulo>✎ Observação</Rotulo>. Descreva o que viu e anexe prints
                ou um .zip de logs. Dá para colar print com <Tecla>Ctrl</Tecla>+<Tecla>V</Tecla>.
              </Check>
              <Check>
                <strong>Geral do modelo:</strong> menu ☰ → <Rotulo>Observação</Rotulo> →{' '}
                <Botao>Adicionar observação</Botao>.
              </Check>
            </ul>
            <Dica>
              A <strong>justificativa técnica</strong> de cada divergência é escrita pela Mobiltec a partir das suas
              observações. Quanto mais clara a observação, mais rápida a validação.
            </Dica>
            <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Anexos: imagens PNG, JPEG ou WebP e arquivos .zip, até 50 MB. Vídeos não são aceitos.
            </p>
          </>
        ),
      },
      {
        id: 'ficha',
        titulo: 'Preencher a ficha',
        conteudo: (
          <p>
            Clique no campo da ficha para editar: <Tecla>Enter</Tecla> salva e <Tecla>Esc</Tecla> cancela. A foto entra
            em <Rotulo>+ foto</Rotulo> (PNG, JPEG ou WebP, até 8 MB).
          </p>
        ),
      },
    ],
  },
  {
    id: 'caminho',
    categoria: 'validacao',
    titulo: 'O caminho até o certificado',
    resumo: 'Todo dispositivo passa pelas mesmas etapas, e cada uma define quem está com ele.',
    destaque: (
      <>
        Você só edita enquanto o dispositivo está <Chip tipo="rascunho">Em homologação</Chip> ou{' '}
        <Chip tipo="revisao">Em revisão</Chip>. Nas outras etapas ele está com a Mobiltec ou já foi concluído.
      </>
    ),
    tags: ['status', 'etapas', 'fluxo'],
    leitura: 2,
    relacionados: ['enviar', 'revisao', 'certificado'],
    secoes: [
      {
        id: 'etapas',
        titulo: 'As etapas',
        conteudo: <FluxoStatus />,
      },
      {
        id: 'o-que-cada-uma-significa',
        titulo: 'O que cada etapa significa',
        conteudo: (
          <div className="grid gap-2">
            <Etapa chip={<Chip tipo="rascunho">Em homologação</Chip>} texto="Com você. Cadastre e registre os testes." />
            <Etapa chip={<Chip tipo="validacao">Em validação</Chip>} texto="Com a Mobiltec, em análise. Somente leitura para você." />
            <Etapa chip={<Chip tipo="revisao">Em revisão</Chip>} texto="De volta com você, com ajustes pedidos pela Mobiltec." />
            <Etapa chip={<Chip tipo="ok">Homologado</Chip>} texto="Aprovado. Certificado liberado." />
          </div>
        ),
      },
    ],
  },
  {
    id: 'enviar',
    categoria: 'validacao',
    titulo: 'Enviar para validação',
    resumo: 'Terminou os testes? Envie o modelo para a Mobiltec analisar.',
    destaque: (
      <>
        No menu ☰ da coluna, <Botao destaque>Enviar para Validação</Botao>. A partir daí o modelo fica somente para
        leitura até a Mobiltec responder.
      </>
    ),
    tags: ['enviar', 'validação', 'apoio'],
    leitura: 1,
    relacionados: ['caminho', 'revisao', 'testar'],
    secoes: [
      {
        id: 'enviar-passos',
        titulo: 'Enviar o modelo',
        conteudo: (
          <Passos>
            <PassoItem>
              No menu ☰ da coluna, clique em <Botao destaque>Enviar para Validação</Botao>.
            </PassoItem>
            <PassoItem>
              Para aparecer no certificado como apoio técnico, marque <Rotulo>Cadastrar como Apoio do Parceiro</Rotulo>.
            </PassoItem>
            <PassoItem>
              Confirme em <Botao destaque>Enviar para Validação Mobiltec</Botao>. O status passa para{' '}
              <Chip tipo="validacao">Em validação</Chip>.
            </PassoItem>
          </Passos>
        ),
      },
      {
        id: 'antes-de-enviar',
        titulo: 'Antes de enviar',
        conteudo: (
          <Dica>
            Se ainda houver itens <em>Não testado</em>, o sistema avisa, mas não impede o envio. Confira antes: item não
            testado sai em branco no certificado.
          </Dica>
        ),
      },
    ],
  },
  {
    id: 'revisao',
    categoria: 'validacao',
    titulo: 'Revisão e ajustes',
    resumo: 'Quando a Mobiltec precisa de algum ajuste, o dispositivo volta para você com o motivo escrito.',
    destaque: (
      <>
        O dispositivo fica <Chip tipo="revisao">Em revisão</Chip> e o apontamento continua visível no seu painel até
        você corrigir e reenviar.
      </>
    ),
    tags: ['revisão', 'ajustes', 'avisos'],
    leitura: 2,
    relacionados: ['enviar', 'paineis', 'caminho'],
    secoes: [
      {
        id: 'como-e-avisado',
        titulo: 'Como você é avisado',
        conteudo: (
          <ul className="space-y-2.5">
            <Check>
              No sino <Icone nome="sino" className="inline h-3.5 w-3.5 align-[-2px]" /> do topo, com o título{' '}
              <em>Revisão solicitada</em>.
            </Check>
            <Check>No painel da sua empresa, no card do dispositivo, com o texto do apontamento.</Check>
          </ul>
        ),
      },
      {
        id: 'ajustar-e-reenviar',
        titulo: 'Ajustar e reenviar',
        conteudo: (
          <Passos>
            <PassoItem>
              Leia o apontamento e clique em <Botao>✓ Confirmar recebimento (Ciente)</Botao>.
            </PassoItem>
            <PassoItem>
              Clique em <Botao>Ajustar</Botao> e corrija na matriz o que foi pedido.
            </PassoItem>
            <PassoItem>
              No menu ☰ da coluna, use <Botao destaque>Reenviar para Validação</Botao>.
            </PassoItem>
          </Passos>
        ),
      },
    ],
  },
  {
    id: 'certificado',
    categoria: 'certificado',
    titulo: 'Baixar o certificado',
    resumo: 'Aprovado o dispositivo, o certificado oficial fica disponível para consulta e download em PDF.',
    destaque: (
      <>
        Você recebe um aviso no sino quando o dispositivo vira <Chip tipo="ok">Homologado</Chip>. Antes disso, o
        certificado fica bloqueado.
      </>
    ),
    tags: ['certificado', 'pdf', 'datasheet'],
    leitura: 1,
    relacionados: ['reteste', 'paineis', 'caminho'],
    secoes: [
      {
        id: 'onde-encontrar',
        titulo: 'Onde encontrar',
        conteudo: (
          <ul className="space-y-2.5">
            <Check>
              No card do dispositivo, no painel da sua empresa: <Botao>Certificado</Botao>.
            </Check>
            <Check>
              No menu ☰ da coluna, na matriz: <Rotulo>Certificado</Rotulo>.
            </Check>
            <Check>
              No próprio aviso do sino: <Rotulo>Acessar →</Rotulo>.
            </Check>
          </ul>
        ),
      },
      {
        id: 'baixar',
        titulo: 'Baixar o PDF e o datasheet',
        conteudo: (
          <p>
            Na tela do certificado, <Botao destaque>Baixar Certificado</Botao> gera o PDF. A ficha técnica do fabricante,
            quando cadastrada, sai em <Botao>Exportar Datasheet</Botao>, dentro de <Rotulo>Exibir informações</Rotulo> no
            Painel Mobiltec.
          </p>
        ),
      },
    ],
  },
  {
    id: 'reteste',
    categoria: 'certificado',
    titulo: 'Abrir um reteste',
    resumo: 'Saiu uma nova versão do agente? Teste de novo sem perder o histórico.',
    destaque: <>A homologação anterior continua guardada. A coluna passa a mostrar o reteste, do zero.</>,
    tags: ['reteste', 'versão', 'histórico'],
    leitura: 1,
    relacionados: ['certificado', 'cadastrar', 'testar'],
    secoes: [
      {
        id: 'abrir-reteste',
        titulo: 'Abrir o reteste',
        conteudo: (
          <Passos>
            <PassoItem>
              No menu ☰ da coluna, clique em <Rotulo>Reteste</Rotulo>.
            </PassoItem>
            <PassoItem>
              Informe a <strong>Nova versão do agente</strong> (e, se mudou, a versão do SO).
            </PassoItem>
            <PassoItem>
              Clique em <Botao destaque>Abrir reteste</Botao>.
            </PassoItem>
          </Passos>
        ),
      },
    ],
  },
  {
    id: 'duvidas',
    categoria: 'ajuda',
    titulo: 'Dúvidas rápidas',
    resumo: 'As perguntas que mais aparecem no dia a dia, com a resposta direta.',
    destaque: <>Não achou o que procurava? Fale com a equipe de homologação da Mobiltec.</>,
    tags: ['faq', 'ajuda'],
    leitura: 2,
    relacionados: ['caminho', 'testar', 'certificado'],
    secoes: [
      {
        id: 'perguntas',
        titulo: 'Perguntas frequentes',
        conteudo: (
          <div className="space-y-2">
            <Pergunta q="Não consigo editar a matriz.">
              O dispositivo está com a Mobiltec (<em>Em validação</em>) ou já foi concluído. Você só edita em{' '}
              <em>Em homologação</em> ou <em>Em revisão</em>.
            </Pergunta>
            <Pergunta q="Não vejo um tipo de dispositivo no menu.">
              O acesso é liberado por tipo. Peça à Mobiltec para incluir o tipo na sua conta.
            </Pergunta>
            <Pergunta q="Cadastrei um modelo por engano.">
              Menu ☰ da coluna → <Rotulo>Remover da planilha</Rotulo>. Vale enquanto ele não foi finalizado e só para quem
              o cadastrou.
            </Pergunta>
            <Pergunta q="Onde escrevo a justificativa de uma falha?">
              A justificativa oficial é escrita pela Mobiltec. Registre tudo na observação do item, com prints e logs: é a
              base dela.
            </Pergunta>
            <Pergunta q="O certificado está bloqueado.">
              Ele é liberado só depois da aprovação da Mobiltec. Até lá, a tela mostra a etapa atual.
            </Pergunta>
          </div>
        ),
      },
    ],
  },
]

const POR_ID = new Map(ARTIGOS.map((a) => [a.id, a]))

function lerHash(): string | null {
  const id = window.location.hash.replace('#', '')
  return POR_ID.has(id) ? id : null
}

// ============================================================
// Página
// ============================================================

export function Guia() {
  const [artigoId, setArtigoId] = useState<string | null>(lerHash)
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [abertas, setAbertas] = useState<Set<string>>(
    () => new Set([POR_ID.get(lerHash() ?? '')?.categoria ?? 'inicio']),
  )
  const [progresso, setProgresso] = useState(0)
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  /** Após um clique no índice, a rolagem suave não sobrescreve a escolha */
  const travaIndice = useRef(0)

  const artigo = artigoId ? POR_ID.get(artigoId) ?? null : null

  useEffect(() => {
    document.title = artigo ? `${artigo.titulo} · Guia de uso` : 'Guia de uso · Homologação Mobiltec'
  }, [artigo])

  // O endereço manda: voltar/avançar do navegador troca o artigo
  useEffect(() => {
    const aoMudar = () => {
      const id = lerHash()
      setArtigoId(id)
      if (id) setAbertas((a) => new Set([...a, POR_ID.get(id)!.categoria]))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  // Barra roxa do topo: quanto do artigo já foi lido
  useEffect(() => {
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgresso(total > 0 ? Math.min(1, window.scrollY / total) : 1)
    }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [artigoId])

  // "Nesta página" acompanha a seção em leitura: a última cujo título já
  // passou do cabeçalho fixo. No fim da página, vale a última seção.
  useEffect(() => {
    if (!artigo) return
    const aoRolar = () => {
      if (Date.now() < travaIndice.current) return
      const fim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let atual = artigo.secoes[0]?.id ?? null
      for (const sec of artigo.secoes) {
        const el = document.getElementById(sec.id)
        if (el && el.getBoundingClientRect().top <= 140) atual = sec.id
      }
      if (fim) atual = artigo.secoes[artigo.secoes.length - 1]?.id ?? atual
      setSecaoAtiva(atual)
    }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [artigo])

  const resultadosBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return []
    return ARTIGOS.filter((a) =>
      [a.titulo, a.resumo, ...a.tags].join(' ').toLowerCase().includes(termo),
    )
  }, [busca])

  function alternarCategoria(id: string) {
    setAbertas((a) => {
      const n = new Set(a)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }

  const indice = artigo ? ARTIGOS.indexOf(artigo) : -1
  const anterior = indice > 0 ? ARTIGOS[indice - 1] : null
  const proximo = indice >= 0 && indice < ARTIGOS.length - 1 ? ARTIGOS[indice + 1] : null
  const categoriaAtual = artigo ? CATEGORIAS.find((c) => c.id === artigo.categoria) : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-card)', color: 'var(--color-foreground)' }}>
      {/* Topo */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-3" aria-label="Início do guia">
            <LogoMobiltec className="h-8 w-auto" />
          </a>
          <span className="h-5 w-px" style={{ background: 'var(--color-border)' }} />
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icone nome="guia" className="h-4 w-4" />
            Guia de uso
          </span>
          <a
            href="/"
            className="ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--color-muted)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
          >
            Abrir o sistema
          </a>
        </div>
        <div className="h-[3px] w-full" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${progresso * 100}%`, background: 'var(--gradient-brand-purple)' }}
          />
        </div>
      </header>

      <div className="flex">
        {/* ---------------- Esquerda: navegação ---------------- */}
        <aside
          className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-72 shrink-0 overflow-y-auto border-r px-4 py-5 lg:block"
          style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}
        >
          <a href="#" className={`guia-nav-item ${!artigo ? 'guia-nav-ativo' : ''}`}>
            <Icone nome="home" className="h-4 w-4" />
            Início
          </a>
          {buscando ? (
            <div className="relative mt-1">
              <Icone nome="busca" className="absolute left-2.5 top-2 h-4 w-4 opacity-60" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setBusca('')
                    setBuscando(false)
                  }
                }}
                placeholder="Buscar no guia…"
                className="w-full rounded-lg border bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setBuscando(true)} className="guia-nav-item w-full">
              <Icone nome="busca" className="h-4 w-4" />
              Buscar
            </button>
          )}

          {busca.trim() ? (
            <div className="mt-4">
              <p className="guia-nav-rotulo">Resultados</p>
              {resultadosBusca.length === 0 ? (
                <p className="px-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Nada encontrado para "{busca}".
                </p>
              ) : (
                resultadosBusca.map((a) => (
                  <a key={a.id} href={`#${a.id}`} className="guia-nav-sub" onClick={() => setBusca('')}>
                    {a.titulo}
                  </a>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="my-4 border-t" style={{ borderColor: 'var(--color-border)' }} />
              <p className="guia-nav-rotulo">Categorias</p>
              {CATEGORIAS.map((c) => {
                const aberta = abertas.has(c.id)
                const doGrupo = ARTIGOS.filter((a) => a.categoria === c.id)
                const contem = artigo?.categoria === c.id
                return (
                  <div key={c.id}>
                    <button
                      type="button"
                      onClick={() => alternarCategoria(c.id)}
                      className={`guia-nav-item w-full justify-between ${contem ? 'guia-nav-grupo-ativo' : ''}`}
                      aria-expanded={aberta}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icone nome={c.icone} className="h-4 w-4" />
                        {c.titulo}
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform"
                        style={{ transform: aberta ? 'rotate(90deg)' : 'none' }}
                        aria-hidden
                      >
                        <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {aberta && (
                      <div className="mb-1 ml-[19px] border-l pl-2" style={{ borderColor: 'var(--color-border)' }}>
                        {doGrupo.map((a) => (
                          <a
                            key={a.id}
                            href={`#${a.id}`}
                            className={`guia-nav-sub ${a.id === artigoId ? 'guia-nav-sub-ativo' : ''}`}
                          >
                            {a.titulo}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </aside>

        {/* ---------------- Centro ---------------- */}
        <main className="min-w-0 flex-1">
          {/* Navegação compacta (celular/tablet) */}
          <div className="border-b px-4 py-3 lg:hidden" style={{ borderColor: 'var(--color-border)' }}>
            <select
              value={artigoId ?? ''}
              onChange={(e) => {
                window.location.hash = e.target.value
              }}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="">Início</option>
              {CATEGORIAS.map((c) => (
                <optgroup key={c.id} label={c.titulo}>
                  {ARTIGOS.filter((a) => a.categoria === c.id).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.titulo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {artigo ? (
            <div className="flex">
              <article className="min-w-0 flex-1 px-5 py-7 sm:px-10 lg:py-9">
                <div className="mx-auto max-w-[44rem]">
                  {/* Trilha */}
                  <nav className="flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
                    <a href="#" className="hover:underline">Início</a>
                    <Chevron />
                    <span>{categoriaAtual?.titulo}</span>
                    <Chevron />
                    <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{artigo.titulo}</span>
                  </nav>

                  <p className="mt-6 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <Icone nome="relogio" className="h-3.5 w-3.5" />
                    {artigo.leitura} min de leitura · Atualizado em {ATUALIZADO_EM}
                  </p>
                  <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-[2.1rem]">{artigo.titulo}</h1>
                  <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                    {artigo.resumo}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {artigo.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md px-2 py-0.5 font-mono text-[11.5px]"
                        style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                      >
                        #{t.replace(/\s+/g, '-')}
                      </span>
                    ))}
                  </div>

                  <hr className="my-6" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Em resumo: barra roxa à esquerda, textura sutil */}
                  <div className="guia-destaque textura-pontos rounded-r-lg py-3.5 pl-5 pr-4 text-[15px] leading-relaxed">
                    {artigo.destaque}
                  </div>

                  {artigo.secoes.map((s) => (
                    <section key={s.id} id={s.id} className="scroll-mt-24 pt-9">
                      <h2 className="mb-3 text-xl font-bold tracking-tight">{s.titulo}</h2>
                      <div className="text-[15px] leading-relaxed">{s.conteudo}</div>
                    </section>
                  ))}

                  {/* Anterior / próximo */}
                  <div className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2" style={{ borderColor: 'var(--color-border)' }}>
                    {anterior ? (
                      <a href={`#${anterior.id}`} className="guia-cartao-nav">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                          ← Anterior
                        </span>
                        <span className="mt-0.5 font-semibold">{anterior.titulo}</span>
                      </a>
                    ) : (
                      <span />
                    )}
                    {proximo && (
                      <a href={`#${proximo.id}`} className="guia-cartao-nav text-right">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                          Próximo →
                        </span>
                        <span className="mt-0.5 font-semibold">{proximo.titulo}</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>

              {/* ---------------- Direita ---------------- */}
              <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-64 shrink-0 overflow-y-auto py-9 pr-6 xl:block">
                <p className="guia-nav-rotulo !px-0">Nesta página</p>
                <ul className="border-l" style={{ borderColor: 'var(--color-border)' }}>
                  {artigo.secoes.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${artigo.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          travaIndice.current = Date.now() + 900
                          setSecaoAtiva(s.id)
                          document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className={`guia-toc ${secaoAtiva === s.id ? 'guia-toc-ativo' : ''}`}
                      >
                        {s.titulo}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="my-5 border-t" style={{ borderColor: 'var(--color-border)' }} />
                <p className="guia-nav-rotulo !px-0">Ações</p>
                <button
                  type="button"
                  onClick={copiarLink}
                  className="flex items-center gap-2 text-[13px] transition-colors hover:text-[var(--color-primary)]"
                  style={{ color: copiado ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                >
                  <Icone nome="compartilhar" className="h-3.5 w-3.5" />
                  {copiado ? 'Link copiado!' : 'Copiar link'}
                </button>

                <div className="my-5 border-t" style={{ borderColor: 'var(--color-border)' }} />
                <p className="guia-nav-rotulo !px-0">Artigos relacionados</p>
                <ul className="space-y-2.5">
                  {artigo.relacionados.map((id) => {
                    const r = POR_ID.get(id)
                    return r ? (
                      <li key={id}>
                        <a href={`#${id}`} className="text-[13px] leading-snug hover:text-[var(--color-primary)]">
                          {r.titulo}
                        </a>
                      </li>
                    ) : null
                  })}
                </ul>
              </aside>
            </div>
          ) : (
            <Inicio />
          )}
        </main>
      </div>
    </div>
  )
}

/** Página inicial do guia: boas-vindas e as categorias */
function Inicio() {
  return (
    <div className="px-5 py-8 sm:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="textura-grade relative overflow-hidden rounded-2xl border px-6 py-9 sm:px-10" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            Guia de uso
          </p>
          <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Como homologar na plataforma Mobiltec
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
            Do primeiro modelo cadastrado ao certificado baixado, em artigos curtos e diretos.
          </p>
          <a
            href="#onde-voce-esta"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ background: 'var(--color-primary)' }}
          >
            Comece por aqui
            <span aria-hidden>→</span>
          </a>
        </div>

        <h2 className="mt-10 text-lg font-bold tracking-tight">Categorias</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map((c) => {
            const doGrupo = ARTIGOS.filter((a) => a.categoria === c.id)
            return (
              <div key={c.id} className="guia-categoria rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
                <span
                  className="grid h-9 w-9 place-items-center rounded-lg"
                  style={{ background: 'rgba(126,32,101,0.08)', color: 'var(--color-primary)' }}
                >
                  <Icone nome={c.icone} className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-3 font-semibold">{c.titulo}</h3>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {c.descricao}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {doGrupo.map((a) => (
                    <li key={a.id}>
                      <a href={`#${a.id}`} className="text-[13px] font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                        {a.titulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="pb-6 pt-10 text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          Ficou alguma dúvida? Fale com a equipe de homologação da Mobiltec.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Peças do conteúdo
// ============================================================

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 opacity-60" aria-hidden>
      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LinkArtigo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a href={`#${id}`} className="font-semibold underline decoration-[rgba(126,32,101,0.35)] underline-offset-2 hover:decoration-current" style={{ color: 'var(--color-primary)' }}>
      {children}
    </a>
  )
}

/** Fluxo de status: o mapa mental do processo */
function FluxoStatus() {
  return (
    <div className="textura-pontos rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Chip tipo="rascunho">Em homologação</Chip>
        <Seta />
        <Chip tipo="validacao">Em validação</Chip>
        <Seta />
        <Chip tipo="ok">Homologado</Chip>
      </div>
      <p className="mt-3 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
        <strong style={{ color: '#b45309' }}>↺ Em revisão:</strong> se a Mobiltec pedir ajustes, o dispositivo volta para
        você, você corrige e reenvia.
      </p>
    </div>
  )
}

function Seta() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden>
      <path d="M3 8h9M9 4.5 12.5 8 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CORES_CHIP = {
  rascunho: { bg: '#f1f5f9', fg: '#475569' },
  validacao: { bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
  revisao: { bg: '#fef3c7', fg: '#b45309' },
  ok: { bg: '#f0fdf4', fg: '#15803d' },
  neutro: { bg: 'var(--color-muted)', fg: 'var(--color-muted-foreground)' },
} as const

function Chip({ tipo, children }: { tipo: keyof typeof CORES_CHIP; children: ReactNode }) {
  const c = CORES_CHIP[tipo]
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold align-middle"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  )
}

/** Imitação visual de um botão do sistema */
function Botao({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <span
      className="mx-0.5 inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12.5px] font-semibold align-middle"
      style={
        destaque
          ? { background: 'var(--color-primary)', color: '#fff' }
          : { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }
      }
    >
      {children}
    </span>
  )
}

/** Nome de menu, filtro ou opção da tela */
function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap font-semibold" style={{ color: 'var(--color-primary)' }}>
      {children}
    </span>
  )
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="mx-0.5 rounded border px-1.5 py-px font-mono text-[11px]"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}
    >
      {children}
    </kbd>
  )
}

function Dica({ children }: { children: ReactNode }) {
  return (
    <div
      className="textura-linhas mt-4 flex gap-2.5 rounded-lg border px-4 py-3 text-[13.5px] leading-relaxed"
      style={{ borderColor: 'rgba(126,32,101,0.14)', color: 'var(--color-info-fg)' }}
    >
      <span className="mt-0.5 shrink-0 text-[11px] font-bold uppercase tracking-wider">Dica</span>
      <span>{children}</span>
    </div>
  )
}

/** Item com o check roxo, como numa lista de verificação */
function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
        style={{ background: 'rgba(126,32,101,0.1)', color: 'var(--color-primary)' }}
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden>
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  )
}

function Passos({ children }: { children: ReactNode }) {
  return <ol className="guia-passos space-y-3">{children}</ol>
}

function PassoItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="guia-passo-n grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
        style={{ background: 'var(--color-primary)', color: '#fff' }}
      />
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function Papel({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <div className="textura-pontos rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[11px] font-bold" style={{ color: 'var(--color-primary)' }}>
        0{n}
      </span>
      <p className="mt-1 font-semibold">{titulo}</p>
      <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
        {texto}
      </p>
    </div>
  )
}

function Escolha({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[14px]">{pergunta}</span>
      <Rotulo>{resposta} →</Rotulo>
    </div>
  )
}

function Etapa({ chip, texto }: { chip: ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
      <span className="w-36 shrink-0">{chip}</span>
      <span className="text-[13.5px]" style={{ color: 'var(--color-muted-foreground)' }}>
        {texto}
      </span>
    </div>
  )
}

function Resultado({ meta }: { meta: (typeof META_STATUS)[keyof typeof META_STATUS] }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
      <Tecla>{meta.atalho}</Tecla>
      <span
        className="w-28 shrink-0 rounded px-2 py-0.5 text-center text-[11.5px] font-semibold"
        style={{ background: meta.corSoft, color: meta.cor }}
      >
        {meta.rotulo}
      </span>
      <span className="text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
        {meta.descricao}
      </span>
    </div>
  )
}

function Pergunta({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {q}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden>
          <path d="M4 6.5 8 10.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
        {children}
      </p>
    </details>
  )
}
