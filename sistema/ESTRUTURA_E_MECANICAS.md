# Estrutura e Mecânicas do Projeto: Sistema de Homologação Mobiltec

Este documento foi criado para fornecer a uma IA o contexto estrutural e o funcionamento mecânico do Sistema de Homologação Mobiltec. O projeto é um sistema web interno para homologação de dispositivos na solução MDM (Mobile Device Management) Cloud4Mobile.

## 1. Visão Geral e Estrutura do Repositório

O projeto é um monorepo contendo backend e frontend, além de scripts para gerenciar um banco de dados portátil (PostgreSQL 16):

- **`/backend/`**: Desenvolvido em Node.js usando **Fastify** e **Prisma ORM**.
  - **`prisma/`**: Contém o schema do banco, seeds e scripts vitais de migração de dados (extração/importação).
  - **`src/`**: Estrutura de rotas (`/auth`, `/dispositivos`, `/catalogo`, `/homologacoes`), validação via `Zod`, handler global de erros e serviços (como o gerador de certificados).
- **`/frontend/`**: Aplicação SPA construída com **Vite**, **React 19**, **TypeScript**, **Tailwind 4**, **React Router 7** e **TanStack Query**.
- **Arquivos Raiz (`*.ps1`)**: Scripts em PowerShell para iniciar o banco portátil (`start-postgres.ps1`), configurar (`setup-postgres.ps1`) e inicializar o schema (`init-db.ps1`).

---

## 2. Extração de Informações Sem Erros (Planilhas Legadas)

O sistema possui uma mecânica altamente segura e separada em duas etapas para extrair dados da antiga planilha do Excel ("Homologação PoS.xlsx"), garantindo que os dados não sejam mal interpretados:

### Passo 1: Transcrição Pura (`extrair-planilha.py`)
O script Python usa `openpyxl` para ler as colunas e células exatas. Ele **apenas transcreve** os valores literais do Excel para um arquivo `planilha-pos.json`, sem tentar interpretar o que significa um "Não" ou "Sim".

### Passo 2: Tradução Idempotente (`importar-planilha.ts`)
O script TypeScript lê o JSON puro e toma as decisões arquiteturais da importação:
- **Idempotência**: Utiliza a chave composta `fabricante + modelo` (com nomes canonizados, ex: "pax a960" vira "PAX") para garantir que o mesmo dispositivo não seja importado duplicado.
- **Desambiguação Automática Baseada em Regras**: Na planilha legada, o valor "Não" confundia três coisas: falha do agente, limitação do sistema operacional e recurso inexistente. O script usa a versão do Android do dispositivo para decidir:
  - Se é um "Comando de Tela" em Android >= 7, marca como `NAO_SUPORTADO` (Device Admin depreciado).
  - Se falhou em "Rede WiFi" no Android >= 9, sabe que o SSID virou informação sensível e marca `NAO_SUPORTADO`.
- **Fila de Revisão Segura**: Quando o script não consegue desambiguar um "Não" com certeza absoluta, ele marca o item com `NOTA_REVISAO` (`Migrado da planilha...`). Isso evita "chutes" algorítmicos e delega para o humano revisar apenas as divergências genuínas.
- **Proteção contra Sobrescrita**: Nunca atualiza homologações que já estão com o status `APROVADO` ou `PUBLICADO`.

---

## 3. Filtro de Características Específicas

Para lidar com dezenas de dispositivos e inúmeras características na interface de "Matriz de Homologação" (a planilha web), o projeto possui mecânicas avançadas de filtragem:

- **Filtros na Matriz**: O backend entrega rotas (`GET /dispositivos` e `GET /matriz`) que aceitam query params complexos:
  - Filtros transversais que **cortam colunas**: Fabricante, Versão do Agente, Retestados.
  - Filtros verticais que **cortam linhas**: "Faltam homologar", "Só divergências", "Sem justificativa".
- **Sugestão de Justificativas Baseada em Contexto**: Quando uma característica falha, a rota `GET /justificativas?itemId=X&gerenciamento=Y&androidMin=N` filtra as melhores justificativas técnicas para o cenário atual, ordenando pelo `usoCount` (as mais utilizadas aparecem no topo). Isso é feito baseando-se no cruzamento da característica falha com a versão do Android e tipo de gerenciamento do dispositivo em questão.

---

## 4. Automação do Certificado HTML e Campos Editáveis

O arquivo principal para esta lógica é o `backend/src/services/certificado.ts`. Ele é responsável por renderizar o relatório final de homologação dinamicamente e com edição "inline".

### Geração Dinâmica e Regras de Negócio
- **Quebra de Página Calculada**: Em vez de ser um documento estático, o script calcula a altura física exata consumida por cada linha da tabela e cabeçalhos em polegadas (`0.2in`, `0.28in`), empurrando grupos de itens dinamicamente para novas páginas.
- **"O que não foi avaliado, não é atestado"**: Se um campo estiver marcado como `NAO_TESTADO`, o status sai totalmente em branco no certificado. Além disso, se há uma divergência (`FALHA`), mas ela ainda não possui um parágrafo explicativo justificado, o status também é omitido para não acusar o dispositivo sem fundamentação.

### Edição Inline sem Estado no Iframe (Frontend + Backend)
O certificado possui um sistema inteligente de edição "inline" que não compromete a segurança nem bagunça o layout de exportação:

1. **Injeção do Lápis de Edição (`?editavel=1`)**: Quando o Frontend pede o certificado para visualização (Preview), o backend injeta uma tag `<button class="editar">✎</button>` ao lado das justificativas e das assinaturas.
2. **Comunicação por `postMessage`**: O certificado é renderizado no Frontend via `<iframe srcDoc="...">` (totalmente isolado). Quando o usuário clica no lápis de edição, um snippet JavaScript injetado no HTML captura o clique, cancela o evento padrão, e dispara um `parent.postMessage` para a aplicação React.
3. **Persistência Externa**: O React escuta o `message`, abre um modal nativo do design system, e salva no backend. O iFrame é então recarregado. Nenhuma edição ocorre cruamente dentro do DOM do certificado.
4. **Exportação Segura em PDF**: O CSS do HTML contém um bloco `@media print { .editar { display: none !important; } }`. Quando a aplicação dispara a automação para imprimir (renderizar PDF), os lápis desaparecem, gerando um documento limpo.
5. **Ativos Embutidos (Self-Contained)**: Para garantir que o HTML possa gerar o PDF sem quebrar referências, fotos dos dispositivos e a imagem de fundo do documento (`fundo-certificado.png`) são convertidos para **Data URIs em Base64** pelo próprio backend antes de compor a resposta do HTML.
