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

const ATUALIZADO_EM = '15 out 2026'

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
  /** Palavras que levam a este artigo na busca, além do título e das tags */
  chaves?: string[]
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
    chaves: ['menu', 'começar', 'sino', 'avisos', 'introdução'],
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
            <Check>
              <strong>Administrador do ambiente:</strong> quem a Mobiltec liberou vê também{' '}
              <Rotulo>Configurar ambiente</Rotulo>, para escolher as matrizes da empresa e convidar colegas (
              <LinkArtigo id="ambiente">veja como</LinkArtigo>).
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
    chaves: ['vitrine', 'homologados', 'exibir informações', 'pendências', 'empresa', 'oficial'],
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
    id: 'ambiente',
    categoria: 'inicio',
    titulo: 'Configurar o ambiente da empresa',
    resumo: 'O administrador do ambiente escolhe quais matrizes de teste a empresa vê no menu e convida colegas para usar a plataforma.',
    destaque: (
      <>
        Todos os tipos de dispositivo liberados pela Mobiltec chegam ao seu ambiente automaticamente. Você decide quais
        ficam no menu — ocultar <strong>não apaga nada</strong> e pode ser desfeito quando quiser.
      </>
    ),
    tags: ['ambiente', 'administrador', 'colaboradores', 'matrizes'],
    chaves: ['ocultar', 'mostrar', 'olho', 'convidar', 'colega', 'equipe', 'permissão', 'usuário', 'acesso', 'personalizar'],
    leitura: 2,
    relacionados: ['onde-voce-esta', 'paineis', 'matriz'],
    secoes: [
      {
        id: 'quem-configura',
        titulo: 'Quem pode configurar',
        conteudo: (
          <p>
            A opção <Rotulo>Configurar ambiente</Rotulo> aparece no menu só para o <strong>administrador do ambiente</strong>{' '}
            — a permissão é dada pela Mobiltec no cadastro da sua empresa. Não aparece para você? Peça à Mobiltec.
          </p>
        ),
      },
      {
        id: 'matrizes-visiveis',
        titulo: 'Escolher as matrizes do menu',
        conteudo: (
          <>
            <Passos>
              <PassoItem>Abra <Rotulo>Configurar ambiente</Rotulo> e clique em <Rotulo>Personalizar matrizes</Rotulo>.</PassoItem>
              <PassoItem>
                Clique no olho <Icone nome="olho" className="inline h-3.5 w-3.5 align-[-2px]" /> de cada tipo para mostrar ou
                ocultar a matriz.
              </PassoItem>
              <PassoItem>Clique em <Rotulo>Salvar</Rotulo>. O menu de todos da empresa já muda.</PassoItem>
            </Passos>
            <p className="mt-4">
              A matriz oculta sai do menu e da <Rotulo>Matriz de testes</Rotulo> da empresa, mas os dados continuam
              guardados. O <Rotulo>Painel Mobiltec</Rotulo> segue mostrando todos os dispositivos aprovados.
            </p>
          </>
        ),
      },
      {
        id: 'convidar',
        titulo: 'Convidar colaboradores',
        conteudo: (
          <>
            <Passos>
              <PassoItem>Em <Rotulo>Configurar ambiente</Rotulo>, clique em <Rotulo>Convidar colaborador</Rotulo>.</PassoItem>
              <PassoItem>Informe nome, e-mail e uma senha inicial (mínimo de 6 caracteres).</PassoItem>
              <PassoItem>Repasse o e-mail e a senha para a pessoa entrar.</PassoItem>
            </Passos>
            <ul className="mt-4 space-y-2.5">
              <Check>O e-mail precisa ser do mesmo domínio da sua empresa.</Check>
              <Check>
                O colaborador entra com a visão padrão de parceiro e vê as matrizes que você deixou visíveis.
              </Check>
              <Check>
                Para tirar o acesso de alguém, use <Rotulo>Desativar</Rotulo> na lista; <Rotulo>Reativar</Rotulo> devolve.
              </Check>
            </ul>
          </>
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
    chaves: ['planilha', 'coluna', 'filtro', 'divergência', 'revalidados', 'tipo de dispositivo'],
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
    chaves: ['novo modelo', 'cadastro', 'remover', 'excluir', 'configuração', 'imei', 'agente'],
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
    chaves: ['resultado', 'status', 'observação', 'anexo', 'print', 'zip', 'log', 'foto', 'ficha', 'falha', 'justificativa'],
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
    chaves: ['status', 'etapa', 'em validação', 'em revisão', 'homologado', 'editar'],
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
    chaves: ['enviar', 'apoio', 'não testado', 'validação'],
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
    chaves: ['ajuste', 'ciente', 'confirmar recebimento', 'sino', 'notificação', 'reenviar', 'apontamento'],
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
    chaves: ['pdf', 'baixar', 'download', 'datasheet', 'ficha técnica', 'certificado'],
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
    chaves: ['nova versão', 'versão do agente', 'histórico', 'retestar'],
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
    chaves: ['faq', 'bloqueado', 'permissão', 'não consigo', 'engano', 'justificativa'],
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

/** Minúsculas e sem acento: "validacao" encontra "Validação" */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function buscarArtigos(termo: string): Artigo[] {
  const t = normalizar(termo.trim())
  if (!t) return []
  return ARTIGOS.filter((a) =>
    normalizar([a.titulo, a.resumo, ...a.tags, ...(a.chaves ?? []), ...a.secoes.map((x) => x.titulo)].join(' ')).includes(t),
  )
}

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

  const resultadosBusca = useMemo(() => buscarArtigos(busca), [busca])

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
    // Fundo da janela + o guia inteiro num card grande, como as telas do
    // sistema: o fundo aparece nas laterais e no topo. `overflow-clip` (e não
    // `hidden`) para não quebrar o cabeçalho e as colunas fixas.
    <div className="guia-fundo min-h-screen px-2 pb-2 pt-1.5 sm:px-4 sm:pb-4 lg:px-6" style={{ color: 'var(--color-foreground)' }}>
    <div
      className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1320px] overflow-clip rounded-2xl border shadow-[0_1px_3px_rgba(30,10,40,0.06),0_12px_40px_-16px_rgba(30,10,40,0.18)]"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
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
          className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 overflow-y-auto border-r px-3 py-5 lg:block"
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
              <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-56 shrink-0 overflow-y-auto py-9 pr-6 xl:block">
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
    </div>
  )
}

/** Etapas do processo, para o mapa visual da página inicial */
const MAPA_PROCESSO: { n: string; titulo: string; texto: string; artigo: string }[] = [
  { n: '01', titulo: 'Cadastrar', texto: 'Vira uma coluna na matriz', artigo: 'cadastrar' },
  { n: '02', titulo: 'Testar', texto: 'Resultado e observações por item', artigo: 'testar' },
  { n: '03', titulo: 'Validar', texto: 'A Mobiltec confere e aprova', artigo: 'enviar' },
  { n: '04', titulo: 'Certificar', texto: 'PDF oficial liberado', artigo: 'certificado' },
]

/** Página inicial do guia: boas-vindas, busca, mapa do processo e categorias */
function Inicio() {
  const [busca, aoBuscar] = useState('')
  const resultados = useMemo(() => buscarArtigos(busca), [busca])
  const totalMin = ARTIGOS.reduce((t, a) => t + a.leitura, 0)
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[60rem]">
        {/* Abertura: texto e busca à esquerda, mapa do processo à direita */}
        <section className="guia-hero relative z-10 rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
          {/* Decoração em camada própria: recorta o brilho sem cortar o resultado da busca */}
          <div className="guia-hero-fundo pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden />
          <div className="relative grid gap-8 p-6 sm:p-9 md:grid-cols-[minmax(0,1fr)_17.5rem] md:items-center">
            <div className="min-w-0">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border bg-white/80 px-2.5 py-1 text-[11px] font-semibold"
                style={{ borderColor: 'rgba(126,32,101,0.18)', color: 'var(--color-primary)' }}
              >
                <Icone nome="guia" className="h-3.5 w-3.5" />
                Guia de uso · {ARTIGOS.length} artigos · ~{totalMin} min
              </span>
              <h1 className="mt-4 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-balance sm:text-[2.1rem]">
                Homologação de dispositivos{' '}
                <span style={{ color: 'var(--color-primary)' }}>Cloud4Mobile</span>
              </h1>
              <p className="mt-3 max-w-[36rem] text-[15px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                Veja quais dispositivos a Mobiltec já aprovou e quais estão em homologação. Teste os
                seus, guarde o registro de cada etapa e emita seus próprios certificados.
              </p>

              {/* Busca: o caminho mais rápido numa central de ajuda */}
              <div className="relative mt-6 max-w-[30rem]">
                <Icone nome="busca" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <input
                  value={busca}
                  onChange={(e) => aoBuscar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && resultados[0]) window.location.hash = resultados[0].id
                    if (e.key === 'Escape') aoBuscar('')
                  }}
                  placeholder="O que você quer fazer? Ex.: enviar, certificado, foto…"
                  className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(126,32,101,0.08)]"
                  style={{ borderColor: 'var(--color-border)' }}
                  aria-label="Buscar no guia"
                />
                {busca.trim() && (
                  <div
                    className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border bg-white py-1 shadow-lg"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {resultados.length === 0 ? (
                      <p className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
                        Nada encontrado para "{busca}".
                      </p>
                    ) : (
                      resultados.map((r) => (
                        <a
                          key={r.id}
                          href={`#${r.id}`}
                          onClick={() => aoBuscar('')}
                          className="block px-4 py-2.5 transition-colors hover:bg-[var(--color-muted)]"
                        >
                          <span className="block text-sm font-semibold">{r.titulo}</span>
                          <span className="block truncate text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                            {r.resumo}
                          </span>
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href="#onde-voce-esta"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-px"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Comece por aqui
                  <span aria-hidden>→</span>
                </a>
                <a href="#duvidas" className="text-sm font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
                  Dúvidas rápidas
                </a>
              </div>
            </div>

            {/* Mapa do processo: a jornada inteira num relance */}
            <ol className="guia-mapa relative rounded-xl border bg-white/90 p-2 shadow-[0_8px_24px_-12px_rgba(30,10,40,0.22)] backdrop-blur-sm" style={{ borderColor: 'var(--color-border)' }}>
              {MAPA_PROCESSO.map((etapa, i) => (
                <li key={etapa.n}>
                  <a href={`#${etapa.artigo}`} className="guia-mapa-item group flex items-center gap-3 rounded-lg px-3 py-2.5">
                    <span className="guia-mapa-n relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                      {etapa.n}
                      {i < MAPA_PROCESSO.length - 1 && <span className="guia-mapa-linha" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{etapa.titulo}</span>
                      <span className="block truncate text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {etapa.texto}
                      </span>
                    </span>
                    <span className="ml-auto text-sm opacity-0 transition-opacity group-hover:opacity-60" aria-hidden>→</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

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
