# Sistema de Homologação Mobiltec

Sistema web interno para homologação de dispositivos na solução MDM Cloud4Mobile.

> **Retomando o trabalho?** Comece por [HANDOFF.md](HANDOFF.md) — estado atual, como subir o ambiente, contrato da API para o frontend e backlog priorizado.

---

## Pré-requisitos instalados

- Node.js 24.x ✅ (instalado via winget)
- Python 3.12 ✅ (já existia)
- PostgreSQL 16 portátil (configurar via scripts abaixo)

---

## Configuração inicial (fazer UMA vez)

### 1. Aguardar download do PostgreSQL portátil

O arquivo `postgres-portable.zip` (~300MB) deve estar em `sistema/`.
Se ainda estiver baixando, aguarde.

### 2. Extrair e inicializar o banco

```powershell
cd "C:\Users\MOBILTEC\Desktop\Homolog Mobiltec\sistema"

# Extrair e configurar (pedirá senha para o usuário postgres)
.\setup-postgres.ps1

# Iniciar o servidor
.\start-postgres.ps1

# Criar banco e usuário
.\init-db.ps1
```

### 3. Configurar e subir o backend

```powershell
cd backend

# Sincronização do schema e geração do cliente Prisma
# (Em desenvolvimento/sandbox utiliza-se `npx prisma db push` para sincronizar o schema;
# em produção versionada utiliza-se `npx prisma migrate deploy`)
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx prisma db push

# Popular banco com dados iniciais (48 itens, categorias, justificativas, usuários)
npx prisma db seed

# Iniciar servidor em modo desenvolvimento
npm run dev
```

O backend estará em: **http://localhost:3001**

---

## Rotas disponíveis (Etapa 1)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/login` | Login — retorna JWT |
| `GET` | `/auth/me` | Dados do usuário logado |
| `GET` | `/categorias` | Lista categorias |
| `GET` | `/dispositivos` | Lista dispositivos (filtrável) |
| `POST` | `/dispositivos` | Cria dispositivo |
| `GET` | `/dispositivos/:id` | Ficha + histórico |
| `PATCH` | `/dispositivos/:id` | Atualiza |
| `DELETE` | `/dispositivos/:id` | Soft delete |
| `GET` | `/itens-teste` | Lista itens do catálogo |
| `POST` | `/itens-teste` | Novo item |
| `PATCH` | `/itens-teste/:id` | Atualiza (nunca deleta) |
| `GET` | `/baterias` | Lista baterias |
| `GET` | `/baterias/:id` | Detalhes + itens |
| `POST` | `/baterias` | Nova bateria |
| `GET` | `/justificativas` | Lista (filtrável por item/Android/gerenciamento) |
| `POST` | `/justificativas` | Nova |
| `PATCH` | `/justificativas/:id` | Atualiza |
| `GET` | `/usuarios` | Lista usuários (só ADMIN) |
| `POST` | `/homologacoes` | Cria homologação + resultados NAO_TESTADO |
| `GET` | `/homologacoes` | Lista (filtrável) |
| `GET` | `/homologacoes/:id` | Ficha completa + resultados |
| `GET` | `/homologacoes/:id/dashboard` | Resumo de progresso |
| `PUT` | `/homologacoes/:id/resultados/:itemId` | Atualiza resultado (autosave) |
| `POST` | `/homologacoes/:id/status` | Transição de status |
| `POST` | `/homologacoes/:id/reabrir` | Reabre APROVADO → RASCUNHO |

> Contrato detalhado (payloads, enums, códigos de erro) em [HANDOFF.md](HANDOFF.md#3-contrato-da-api-para-o-frontend).

### Exemplo de login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mobiltec.com.br","senha":"admin123"}'
```

---

## Credenciais padrão

| Campo | Valor |
|-------|-------|
| Email | admin@mobiltec.com.br |
| Senha | **admin123** ← trocar antes de usar em produção |

---

## Estrutura do projeto

```
sistema/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Schema completo
│   │   └── seed.ts            # 48 itens + dados iniciais
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── jwt.ts         # Autenticação JWT
│   │   │   └── prisma.ts      # Singleton Prisma
│   │   ├── routes/
│   │   │   ├── auth.ts        # Login
│   │   │   ├── dispositivos.ts
│   │   │   └── catalogo.ts
│   │   └── server.ts          # Entrada principal
│   ├── .env                   # Configurações locais
│   └── package.json
├── frontend/                  # (Etapa 3)
├── DECISOES.md                # Decisões técnicas
├── docker-compose.yml         # PostgreSQL via Docker (se disponível)
├── setup-postgres.ps1         # Setup PostgreSQL portátil
├── start-postgres.ps1         # Inicia PostgreSQL
└── init-db.ps1               # Cria banco e usuário
```

---

## Variáveis de ambiente (`backend/.env`)

```env
DATABASE_URL="postgresql://homolog:homolog_secret@localhost:5432/homologacao"
JWT_SECRET="mude_este_segredo_antes_de_usar_em_producao"
JWT_EXPIRES_IN="8h"
PORT=3001
NODE_ENV=development
UPLOAD_DIR="./uploads"
```
