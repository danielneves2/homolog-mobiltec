# Sistema de Homologação Mobiltec — Equipe de Agentes

Leia CLAUDE.md integralmente antes de trabalhar. Ele é a fonte das regras de
negócio, decisões arquiteturais inalienáveis, convenções de código e Definition of Done.
Este arquivo define como coordenar a equipe de agentes locais no projeto.

## Orquestrador

O agente principal é o orquestrador e o interlocutor direto do usuário.
Responsabilidades:
1. Consultar spec-sistema-homologacao.md e sistema/DECISOES.md para identificar requisitos e precedentes existentes.
2. Definir o escopo, tarefas e arquivos afetados antes da implementação.
3. Se a demanda exigir uma nova escolha técnica, desvio ou ajuste de contrato, redigir o rascunho da nova decisão técnica (ex.: D427+) em sistema/DECISOES.md.
4. Apresentar o plano ao usuário para o **GATE 1**. Não alterar código de produção sem aprovação explícita.
5. Delegar o trabalho aos especialistas em ciclos coordenados.
6. Executar a verificação mecânica (**GATE 3**) via 
pm run agent verify e roteiros Playwright pertinentes.
7. Solicitar revisão independente (hm_revisor ou .review-prompt.md) e relatar resultados ao usuário.

## Especialistas e Delegação

Os perfis de agentes especialistas ficam configurados em .codex/agents/:

| Perfil           | Responsabilidade Principal                                                          |
| ---------------- | ----------------------------------------------------------------------------------- |
| hm_backend     | Rotas Fastify, validação Zod, queries Prisma e gerador de certificados em ackend |
| hm_frontend    | Telas e componentes React 19, TanStack Query e tokens Tailwind 4 em rontend      |
| hm_verificador | Roteiros Playwright em ackend/scripts/, execução de build e lint                 |
| hm_revisor     | Auditoria de regras inalienáveis, integridade funcional e conformidade com DECISOES |

Cada delegação deve conter:
- Objetivo claro da tarefa e arquivos sob responsabilidade de escrita.
- Requisitos funcionais da spec e decisões técnicas aplicáveis.
- Regras inalienáveis a preservar (sem botão genérico Não, justificativas obrigatórias, tokens de design system).
- Comandos mecânicos de verificação para aprovação.

## Coordenação de Arquivos e Execução

- **Escrita isolada:** atribua um único responsável de escrita por arquivo em cada etapa.
- **Contratos antes de telas:** se um novo endpoint ou campo for necessário, defina a rota, schema Zod e migração/schema Prisma antes de conectar o frontend.
- **Cobaias no banco:** qualquer teste automatizado ou manual que crie registros deve excluí-los no encerramento (D398). Nunca deixe dados residuais poluindo a base de homologações.
- **Segredos:** nunca inspecione valores de arquivos .env ou versionar credenciais reais.
- **Não derrubar infraestrutura:** nunca execute resets de banco (db:reset ou parada do PostgreSQL) sem permissão e motivo explícito do usuário.

## Ciclo de Gates

1. **GATE 1 — Planejamento & Decisões:**
   - Orquestrador examina a demanda, spec e histórico.
   - Registra ou reserva o número da decisão em sistema/DECISOES.md (
pm run agent decisao <título>).
   - Apresenta o plano ao usuário e aguarda aprovação (Siga / Aprovado).
2. **GATE 2 — Implementação:**
   - Backend: rotas com validação Zod e tipagem TypeScript estrita.
   - Frontend: componentes com tokens de design system (index.css), sem cores hexadecimais soltas, e abertura imediata de modal de justificativa quando cabível.
3. **GATE 3 — Verificação & Fechamento:**
   - Executar 
pm run agent verify (build backend, lint frontend, build frontend).
   - Executar o script Playwright pertinente à funcionalidade (ex.: 
pm --prefix sistema/backend run verificar:matriz).
   - Gerar prompt de revisão com 
pm run agent review para validação por IA independente.
   - Relatar ao usuário os testes executados, decisões registradas e evidências reais.