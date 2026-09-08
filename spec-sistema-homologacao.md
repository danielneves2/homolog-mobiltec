# Sistema de Homologação de Dispositivos — Especificação Técnica

**Empresa:** Mobiltec
**Produto:** dashboard web interno para homologação de dispositivos na solução MDM (Cloud4Mobile / C4M)
**Versão do doc:** 1.0
**Status:** pronto para implementação do MVP

---

## 1. Contexto

O time de homologação testa dispositivos (PoS, smartphones, coletores, tablets, iOS) contra a solução MDM da empresa. Hoje o processo usa quatro ferramentas desconectadas: uma planilha Excel para os resultados, um bloco de notas para observações, um PowerPoint para o certificado e um export em PDF para o cliente.

Este sistema substitui as quatro por uma fonte única. O admin registra o teste uma vez; o sistema gera a matriz comparativa e o certificado.

**MVP = sistema interno.** Portal externo para parceiros fica para uma fase posterior, mas o modelo de dados já deve prever a separação entre "aprovado" e "publicado".

---

## 2. Escopo

### Dentro do MVP

- Cadastro de categorias de dispositivo
- Cadastro de modelos de dispositivo
- Cadastro do catálogo de itens de teste
- Cadastro de baterias de teste (conjuntos de itens)
- Abertura e execução de homologação (checklist)
- Registro de motivo/justificativa por item não-OK
- Biblioteca de justificativas reutilizáveis
- Matriz comparativa entre modelos
- Exportação do certificado em PDF e PPTX

### Fora do MVP

- Portal externo do parceiro
- Integração com a console C4M
- Execução automática de testes
- Autenticação SSO (usar login local simples)

---

## 3. Glossário

| Termo | Significado |
|---|---|
| **Homologação** | Uma execução completa da bateria de testes sobre uma unidade física de um modelo |
| **Agente** | Aplicativo C4M instalado no dispositivo |
| **Bateria de testes** | Conjunto nomeado de itens de teste aplicado numa homologação |
| **Item de teste** | Funcionalidade individual verificada (ex.: "Wipe", "Time Fencing") |
| **Divergência** | Item cujo resultado não foi OK e que exige justificativa no certificado |
| **PoS** | Terminal de pagamento |
| **Coletor** | Coletor de dados / handheld |
| **Zero-Touch** | Provisionamento automático no primeiro boot |
| **Device Admin** | API Android legada de administração, depreciada a partir do Android 7 |

---

## 4. Modelo de dados

### 4.1 Diagrama

```
Categoria 1─N Dispositivo 1─N Homologacao 1─N Resultado N─1 ItemTeste
                                    │              │
                                    │              └─0..1 Justificativa
                                    └─N─1 BateriaTeste N─N ItemTeste
```

### 4.2 Tabelas

#### `categoria`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | "PoS", "Smartphone", "Coletor", "Tablet", "iOS" |
| `slug` | text unique | |
| `icone` | text | nome do ícone |
| `ordem` | int | |

#### `dispositivo`
Identidade do **modelo**, não da unidade física.

| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `categoria_id` | uuid FK | |
| `fabricante` | text | |
| `modelo` | text | |
| `nome_comercial` | text | ex.: "Positivo L400" |
| `foto_url` | text nullable | usada no certificado |
| `link_fabricante` | text nullable | |
| `criado_em` | timestamptz | |

Unique em (`fabricante`, `modelo`).

#### `homologacao`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `dispositivo_id` | uuid FK | |
| `bateria_id` | uuid FK | qual bateria foi aplicada |
| `numero_serie` | text | da unidade testada |
| `imei_1` | text nullable | |
| `imei_2` | text nullable | |
| `versao_so` | text | ex.: "Android 11" |
| `gerenciamento` | enum | `ANDROID_LEGADO` \| `ANDROID_ENTERPRISE` |
| `tipo_agente` | text | ex.: "Agente PoS", "Agente GPOS700" |
| `versao_agente` | text | ex.: "12.6.8" |
| `ferramenta` | text nullable | ex.: "ADB / Arquivo", "Bluetooth" |
| `metodo_inscricao` | text | ex.: "ADB / Arquivo" |
| `assinatura_agente` | bool | |
| `precisa_assinatura_dev` | bool | |
| `data_inicio` | date | |
| `data_fim` | date nullable | |
| `responsavel_id` | uuid FK usuario | |
| `gerente_id` | uuid FK usuario nullable | |
| `apoio_id` | uuid FK usuario nullable | |
| `status` | enum | `RASCUNHO` \| `EM_REVISAO` \| `APROVADO` \| `PUBLICADO` |
| `homologado` | bool nullable | decisão final; null enquanto rascunho |
| `local_emissao` | text | default "São Paulo" |
| `criado_em` / `atualizado_em` | timestamptz | |

#### `item_teste`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `grupo` | enum | `TELEMETRIA` \| `COLETA` \| `COMANDOS` \| `PERFIS` |
| `nome` | text | ex.: "Wipe" |
| `descricao_acao` | text | coluna "Ação Realizada" do certificado |
| `ordem` | int | |
| `ativo` | bool default true | **nunca deletar item; desativar** |

#### `bateria_teste`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `categoria_id` | uuid FK | |
| `nome` | text | ex.: "PoS — Completa", "PoS — Reteste" |
| `descricao` | text nullable | |
| `ativo` | bool | |

#### `bateria_item` (N:N)
`bateria_id`, `item_id`, `ordem`, `obrigatorio` (bool)

#### `resultado`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `homologacao_id` | uuid FK | |
| `item_id` | uuid FK | |
| `status` | enum StatusResultado | ver §5 |
| `observacao` | text nullable | nota livre do admin |
| `justificativa_id` | uuid FK nullable | texto da biblioteca |
| `justificativa_texto` | text nullable | override / texto livre |
| `atualizado_em` | timestamptz | |

Unique em (`homologacao_id`, `item_id`).

#### `justificativa`
| Campo | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `titulo` | text | ex.: "Device Admin depreciado" |
| `texto` | text | corpo que sai no certificado |
| `fontes` | jsonb | `[{label, url}]` |
| `itens_sugeridos` | uuid[] | itens onde costuma se aplicar |
| `android_min` | int nullable | condição de sugestão |
| `gerenciamento` | enum nullable | condição de sugestão |
| `uso_count` | int | para ordenar por frequência |

#### `usuario`
`id`, `nome`, `email`, `cargo` (ex.: "Responsável Técnico", "Gerente de Validação"), `senha_hash`, `papel` (`ADMIN` \| `HOMOLOGADOR` \| `LEITOR`)

#### `certificado_emitido`
Guarda o arquivo gerado como imutável — o cliente pode pedir reemissão idêntica anos depois.

`id`, `homologacao_id`, `formato` (`PDF` \| `PPTX`), `arquivo_url`, `snapshot` (jsonb com os dados no momento da emissão), `emitido_por`, `emitido_em`

---

## 5. Status de resultado — regra central

```
enum StatusResultado {
  OK             // testado, funcionou
  FALHA          // testado, não funcionou (bug do agente/dispositivo)
  NAO_SUPORTADO  // limitação conhecida da plataforma ou do agente
  COM_RESSALVA   // funciona parcialmente ou de forma diferente do esperado
  NAO_TESTADO    // pendente
  NAO_APLICAVEL  // recurso não existe no hardware
}
```

### Regras de validação

| Status | Justificativa | Sai em "Divergências Técnicas" | Renderiza no certificado como |
|---|---|---|---|
| `OK` | não | não | `[OK]` |
| `FALHA` | **obrigatória** | sim | `[Falha]` |
| `NAO_SUPORTADO` | **obrigatória** | sim | `[ ------ ]` |
| `COM_RESSALVA` | **obrigatória** | sim | `[OK com ressalva]` |
| `NAO_APLICAVEL` | opcional | não | `Não Disponível` |
| `NAO_TESTADO` | opcional | **não sai no certificado** | não sai na matriz |

**Por que `FALHA` e `NAO_SUPORTADO` são separados:** a planilha antiga usava "Não" para os dois. São coisas diferentes — `NAO_SUPORTADO` em *Reiniciar* é o Device Admin depreciado (comportamento esperado, vale para todos os Android 7+); `FALHA` no alarme do GPOS 790 é bug a reportar ao fabricante. A UI **não pode** oferecer um botão genérico "Não".

---

## 6. Catálogo de itens de teste — seed PoS (48 itens)

### Grupo `TELEMETRIA` — "Telemetria e Monitoramento"

| Ordem | Nome | Ação Realizada |
|---|---|---|
| 1 | Nível de Bateria | Leitura em tempo real via console |
| 2 | Histórico de Bateria | Verificação do histórico de bateria |
| 3 | Status de Memória RAM | Leitura em tempo real via console |
| 4 | Status de Armazenamento | Verificação de espaço livre/ocupado |
| 5 | Última Localização | Verificação do último ponto GPS |
| 6 | Histórico de Localização | Verificação do histórico de GPS |
| 7 | Aplicativos Instalados | Validação aplicativos sistema e instalados |
| 8 | Sinal de Rede (4G/Wi-Fi) | Leitura do tipo de conexão e qualidade |
| 9 | Consumo de Dados Móveis | Validação do volume de dados trafegados |
| 10 | Tempo de Uso Apps | Validação do tempo por aplicativo |
| 11 | Consumo WiFi por App | Validação do consumo wifi por aplicativo |
| 12 | Consumo 4G por Apps | Validação do consumo 4G por aplicativo |

### Grupo `COLETA` — "Coleta de Informações"

| Ordem | Nome | Descrição da Coleta |
|---|---|---|
| 1 | IMEI 1 | Identificação única do primeiro slot |
| 2 | IMEI 2 | Identificação única do segundo slot |
| 3 | Número de Série | Validação da identidade do fabricante |
| 4 | Rede WiFi | Identificação do nome rede sem-fio |
| 5 | Endereço IP | Verificação do protocolo internet ativo |
| 6 | Operadora | Identificação da rede móvel utilizada |
| 7 | Fabricante | Confirmação da marca do terminal |
| 8 | Modelo | Validação da versão comercial terminal |
| 9 | Precisão GPS | Verificação da margem da localização |
| 10 | Saúde da Bateria | Diagnóstico da vida útil bateria |
| 11 | SIM Card | Verificação do status chip físico |

### Grupo `COMANDOS` — "Comandos Remotos"

| Ordem | Nome | Descrição da Execução |
|---|---|---|
| 1 | Desabilitar / Habilitar | Gestão da conectividade via console |
| 2 | Alarme | Disparo de sinal sonoro local |
| 3 | Reiniciar | Execução de reboot via console |
| 4 | Bloquear | Aplicação remota de senha segurança |
| 5 | Desbloquear | Liberação remota da tela bloqueada |
| 6 | Wipe | Restauração total padrões fábrica |
| 7 | Requisitar Logs | Upload automático registros técnicos |
| 8 | Visualização Remota | Transmissão da tela do dispositivo |
| 9 | Acesso Remoto | Interação remota com o dispositivo |
| 10 | Instalação | Envio de nova aplicação via console |
| 11 | Desinstalação | Remoção de aplicativos do sistema |
| 12 | Limpeza de Dados | Limpeza dos dados do aplicativo |
| 13 | Instalação Silenciosa | Instalação em background sem intervenção |
| 14 | Instalação Automática | Instalação sem intervenção do Usuário |
| 15 | Requisito de Instalação | Validação da compatibilidade técnica |
| 16 | Mensagem | Envio de aviso de texto direto |

### Grupo `PERFIS` — "Perfis e Políticas MDM"

| Ordem | Nome | Restrição Aplicada |
|---|---|---|
| 1 | Configuração de Monitores | Supervisão centralizada de hardware |
| 2 | Políticas de Senhas | Exigência de senha definida pela console |
| 3 | Configuração de Launcher | Sobreposição da interface sobre o sistema |
| 4 | Time Fencing | Acesso aos aplicativos por horário definido |
| 5 | Apps Bloqueados | Bloqueio ferramentas não autorizadas |
| 6 | Instalação de Apps | Gestão para downloads de aplicativos |
| 7 | Instalação de Conteúdo | Distribuição remota de arquivos |
| 8 | APN Automática | Configuração dos dados móveis |
| 9 | Zero-Touch | Ativação automática no primeiro acesso |

> **Nota de unificação:** a planilha antiga tinha 46 itens e o certificado tinha 47, com divergências entre si. Este catálogo é a união: `Histórico de Bateria` e `Sinal de Rede` vinham só do certificado, `Limpeza de Dados` vinha só da planilha. Total unificado: **48**.

### Itens candidatos (backlog, vindos de notas de campo)

`Alarme por Ordem`, `Alarme por Tempo`, `Mensagem com Alerta Sonoro`, `Permissão de Estatísticas de Uso`, `Bloqueio da Barra de Status`, `Persistência do ID do Dispositivo`.

---

## 7. Fluxo do usuário (MVP)

```
1. Dashboard
   └─ escolhe categoria (PoS)

2. Novo dispositivo (se ainda não existe)
   └─ fabricante, modelo, foto, link

3. Nova homologação
   ├─ seleciona dispositivo
   ├─ preenche ficha da unidade (S/N, IMEI, Android, agente, ferramenta…)
   └─ seleciona bateria de testes  →  cria N resultados NAO_TESTADO

4. Execução do checklist
   ├─ marca status de cada item
   ├─ escreve observação
   └─ para não-OK: escolhe justificativa da biblioteca ou escreve

5. Fechamento
   ├─ sistema mostra resumo (X OK, Y falhas, Z pendentes)
   ├─ admin marca homologado = sim/não
   └─ status → EM_REVISAO → APROVADO

6. Exportação
   └─ botão gera PDF e/ou PPTX, salva em certificado_emitido
```

---

## 8. Geração do certificado

Reproduz o layout do modelo atual, em 3 páginas.

### 8.1 Página 1 — Identificação e início da matriz

Cabeçalho com logo Mobiltec e título "CERTIFICADO DE HOMOLOGAÇÃO TÉCNICA".

Bloco "Descrição do dispositivo": foto à esquerda; à direita, pares label/valor com o valor em roxo — Fabricante, Modelo, Número de Série, IMEI 1, IMEI 2, Versão do SO, Data de Início, Data de Término, Versão do Agente, Método de Inscrição, Assinatura do Agente.

Depois "Matriz de Resultados Técnicos" → tabela de 3 colunas (Item / Ação / Status) por grupo, começando por Telemetria.

### 8.2 Páginas 2–N — Continuação da matriz

Coleta de Informações, Comandos Remotos, Perfis e Políticas MDM. **Altura variável**: o número de itens muda por bateria, então a quebra de página precisa ser calculada, não fixa.

### 8.3 Página final — Análise das Divergências

Título, subtítulo explicativo, depois as divergências **agrupadas por grupo** e, dentro do grupo, **agrupadas por justificativa**. Itens que compartilham a mesma justificativa aparecem juntos no cabeçalho, separados por hífen — ex.: `Reiniciar - Bloquear - Desbloquear` seguido de um único parágrafo.

Item `NAO_TESTADO` **não entra no certificado** — nem na matriz, nem nas divergências. A regra é: o que não foi avaliado não é atestado. O pendente continua visível internamente (checklist e matriz comparativa), mas o documento que chega ao parceiro só afirma o que foi de fato testado.

Rodapé: bloco "Fontes" com os links das justificativas usadas, depois três assinaturas (Responsável Técnico, Gerente de Validação, Apoio Adicional), local e data, e a linha "DOCUMENTO TÉCNICO CONFIDENCIAL – MOBILTEC".

### 8.4 Implementação

**PDF:** template HTML + CSS renderizado headless (Puppeteer ou Playwright). Usar `@page` e `break-inside: avoid` nos blocos de grupo.

**PPTX:** `python-pptx` a partir de um template `.potx` **reconstruído com tabelas reais** — o modelo atual usa caixas de texto soltas, que não são preenchíveis programaticamente. Cada grupo vira uma tabela; a página de divergências precisa de lógica de overflow para quebrar em slides adicionais.

Paleta: roxo Mobiltec `#6B1F5E` (aproximado — extrair o exato do template), texto `#231F20`, linhas divisórias em roxo.

---

## 9. Biblioteca de justificativas — seed inicial

```json
[
  {
    "titulo": "Device Admin depreciado — comandos de tela",
    "texto": "Funcionalidade não suportada pelo agente legado C4M em Android 7+ ou superior, devido à depreciação do modelo Device Admin para uso corporativo. Para execução do comando, é necessário suporte específico do fabricante via SDK ou implementação dedicada.",
    "itens_sugeridos": ["Reiniciar", "Bloquear", "Desbloquear"],
    "android_min": 7,
    "gerenciamento": "ANDROID_LEGADO",
    "fontes": [{"label": "Android Enterprise — Device Admin Deprecation", "url": ""}]
  },
  {
    "titulo": "SSID como informação sensível — Android 9+",
    "texto": "Em versões Android 9 ou superior, o SSID da rede Wi-Fi é tratado como informação sensível, pois pode indicar a localização do usuário. Dessa forma, a identificação do nome da rede depende das permissões concedidas ao agente e das configurações do dispositivo. Caso a informação não seja coletada no cenário homologado, será necessário suporte específico do fabricante via SDK ou implementação dedicada.",
    "itens_sugeridos": ["Rede WiFi"],
    "android_min": 9,
    "fontes": [{"label": "Android 9 — Visão geral da verificação de Wi-Fi", "url": ""}]
  },
  {
    "titulo": "Políticas de senha limitadas — Android 9+",
    "texto": "Políticas de senha podem ser limitadas no agente legado C4M em Android 9+, devido à depreciação do modelo Device Admin para uso corporativo. Para aplicação completa, é necessário suporte do fabricante via SDK ou implementação dedicada.",
    "itens_sugeridos": ["Políticas de Senhas"],
    "android_min": 9,
    "gerenciamento": "ANDROID_LEGADO"
  },
  {
    "titulo": "Apps Bloqueados — desinstalação em vez de bloqueio",
    "texto": "Funcionalidade com ressalva: o agente legado C4M não bloqueia a aplicação, realiza a desinstalação do app no dispositivo.",
    "itens_sugeridos": ["Apps Bloqueados"],
    "gerenciamento": "ANDROID_LEGADO"
  }
]
```

Zero-Touch normalmente tem justificativa específica por modelo (menciona a versão do agente), então fica como texto livre.

---

## 10. Telas

### 10.1 Dashboard
Cards por categoria com contagem de homologados / em andamento / pendentes. Lista das últimas homologações com dispositivo, responsável, data e status.

### 10.2 Lista de dispositivos
Tabela filtrável por fabricante, categoria, versão Android, versão do agente e status. Busca por texto.

### 10.3 Ficha do dispositivo
Identidade + linha do tempo de homologações. Cada entrada mostra versão do agente, data, resultado e link para o certificado.

### 10.4 Checklist de execução — **a tela mais importante**

É onde o admin passa a maior parte do tempo, e ela precisa ser mais rápida que a planilha, senão o sistema não é adotado.

- Grupos colapsáveis; progresso por grupo e total
- Uma linha por item: nome, ação esperada, botões de status, ícone de observação
- **Atalhos de teclado**: `1`–`6` para status, `↑`/`↓` para navegar, `Enter` abre observação
- Autosave em cada mudança, sem botão "salvar"
- Ao marcar `FALHA`, `NAO_SUPORTADO` ou `COM_RESSALVA`, abrir painel com justificativas sugeridas para aquele item + Android + gerenciamento; opção de texto livre
- Se o texto livre já tiver sido escrito antes, sugerir salvar na biblioteca
- Não permitir avançar para `EM_REVISAO` com item obrigatório sem justificativa

### 10.5 Matriz comparativa
Linhas = itens, colunas = modelos. Seleção de 2 a 6 modelos. Filtro "mostrar só divergências". Cabeçalho fixo. Export CSV/XLSX.

### 10.6 Preview e exportação do certificado
Renderização fiel ao lado dos botões de export. Avisar se houver pendências antes de emitir.

### 10.7 Administração
CRUD de itens de teste, baterias, justificativas, categorias e usuários.

---

## 11. Regras de negócio

1. Item de teste **nunca é deletado** — só desativado. Homologações antigas precisam continuar renderizando.
2. Reteste gera **nova homologação**, nunca sobrescreve. O histórico por versão de agente é informação de valor.
3. Certificado emitido é **imutável**: guardar o arquivo e um snapshot JSON dos dados.
4. Homologação em `APROVADO` fica somente-leitura; alterar exige reabrir para `RASCUNHO`, com log.
5. `homologado` é decisão **manual** do admin — não calcular automaticamente a partir dos status (ver §12).

---

## 12. Decisões em aberto

| # | Decisão | Default adotado se não houver definição |
|---|---|---|
| 1 | Existe conjunto mínimo de itens obrigatórios em `OK` para considerar homologado? | Decisão manual, sem regra automática |
| 2 | ~~Item `NAO_TESTADO` aparece no certificado?~~ **DECIDIDO** | Não aparece — o que não foi avaliado fica fora do documento |
| 3 | PPTX é para edição manual antes do envio ou só caminho até o PDF? | Gerar os dois; PDF é o principal |
| 4 | Assinaturas do certificado são fixas ou por homologação? | Por homologação, com valores default |
| 5 | Stack | Ver §13 |

---

## 13. Stack sugerida

Nada aqui está fechado — o modelo de dados é agnóstico. Mas o critério que mais pesa é a **fidelidade do certificado gerado**, já que é o entregável que chega ao cliente.

**Recomendação:**

- **Front:** React + TypeScript + Vite, TailwindCSS, TanStack Query
- **Back:** Node + Fastify (ou NestJS), Prisma
- **Banco:** PostgreSQL
- **PDF:** Playwright headless sobre template HTML
- **PPTX:** serviço Python com `python-pptx`
- **Arquivos:** S3 ou storage local no MVP

Se a empresa já roda .NET, a mesma modelagem funciona com EF Core + QuestPDF para o PDF.

**A evitar:** montar o PDF coordenada a coordenada com bibliotecas de baixo nível. O certificado tem 3 páginas densas e altura variável; manter isso em código imperativo custa caro em manutenção.

---

## 14. Roadmap

**Fase 0 — Fundação de dados**
Seed do catálogo (§6) e das justificativas (§9). Migração dos 31 PoS da planilha, desambiguando cada "Não" entre `FALHA`, `NAO_SUPORTADO` e `NAO_APLICAVEL`. *Esta é a etapa que exige conhecimento humano do domínio e não pode ser automatizada.*

**Fase 1 — MVP**
Telas 10.1 a 10.4 e 10.6. Export PDF. Uso interno.

**Fase 2 — Qualidade**
Matriz comparativa, anexos (print/log) por resultado, fluxo de aprovação, diff entre homologações do mesmo modelo, export PPTX.

**Fase 3 — Externo**
Portal do parceiro somente-leitura, demais categorias (Smartphone, Coletor, Tablet, iOS), export XLSX.
