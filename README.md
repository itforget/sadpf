# SADPF — Sistema de Arquivo Digital de Pastas Funcionais

Sistema de gestão documental corporativa da **SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA DO DF**. Plataforma web para digitalização, busca, auditoria e encaminhamento de pastas funcionais de servidores públicos.

---

## Stack

| Camada        | Tecnologia                                                   |
| ------------- | ------------------------------------------------------------ |
| Framework     | **Next.js 16** (App Router, Turbopack, `proxy.ts`)           |
| Linguagem     | TypeScript 5                                                 |
| UI            | Tailwind CSS 4, `@base-ui/react`, `class-variance-authority` |
| Forms         | `react-hook-form` v7 + Zod v4                                |
| ORM           | Prisma v7 (`@prisma/adapter-pg`)                             |
| Banco         | PostgreSQL                                                   |
| Senhas        | bcryptjs                                                     |
| Auth          | JWT HMAC-SHA256 custom (cookie `sadpf_session`)              |
| E-mail        | Resend API (primeiro acesso)                                 |
| Lint / Format | ESLint 9 + Prettier                                          |

---

## Estrutura do Projeto

```
sadpf/
├── prisma/
│   ├── schema.prisma          # Schema Prisma (models, enums)
│   ├── seed.ts                # Seed de teste (ADMIN + OPERADOR)
│   └── migrations/
├── lib/
│   ├── server/
│   │   ├── auth.ts            # JWT signing/verification, session helpers
│   │   ├── db.ts              # Funções de acesso ao banco (getServidores, etc.)
│   │   └── prisma.ts          # Instância Prisma singleton
│   ├── validations/           # Schemas Zod por domínio (auth, servidor, documento, etc.)
│   ├── storage/               # Abstração de storage (local, Supabase)
│   ├── types.ts               # Tipos TypeScript compartilhados
│   └── utils.ts               # cn() helper (clsx + tailwind-merge)
├── app/
│   ├── layout.tsx             # Layout raiz (Sidebar + Topbar)
│   ├── globals.css
│   ├── login/page.tsx         # Tela de login
│   ├── dashboard/page.tsx     # Painel principal
│   ├── servidores/            # Pastas funcionais de servidores
│   │   ├── page.tsx           #   Listagem + criação
│   │   └── [id]/page.tsx      #   Capa da pasta (CapaPasta)
│   ├── documentos/            # Documentos PDF
│   │   ├── novo/page.tsx      #   Upload com OCR
│   │   └── [id]/page.tsx      #   Detalhe
│   ├── usuarios/page.tsx      # Gerenciamento de usuários (ADMIN only)
│   ├── configuracoes/page.tsx # Configurações do sistema (ADMIN only)
│   ├── logs/page.tsx          # Trilha de auditoria (ADMIN only)
│   ├── pesquisa/page.tsx      # Busca OCR
│   ├── relatorios/page.tsx    # Relatórios
│   ├── encaminhamentos/       # Encaminhamento de pastas
│   ├── impressoes/page.tsx    # Impressão de documentos
│   └── pastas/page.tsx        # Visualização de pastas
├── app/api/
│   ├── auth/login/route.ts    # POST login
│   ├── auth/session/route.ts  # GET sessão / DELETE logout
│   ├── servidores/route.ts    # GET/POST/PUT servidores
│   ├── upload/route.ts        # Upload de PDFs
│   ├── logs/route.ts          # Logs de auditoria
│   ├── encaminhamentos/route.ts
│   ├── pesquisa/route.ts      # Busca OCR
│   ├── search/route.ts        # Busca global rápida
│   └── health/route.ts        # Healthcheck
├── app/components/
│   ├── Sidebar.tsx            # Menu lateral (filtra itens por role)
│   ├── Topbar.tsx             # Barra superior (nome, role, logout)
│   ├── CapaPasta.tsx          # Componente da capa da pasta funcional
│   ├── DocumentCard.tsx       # Card de documento PDF
│   ├── UploadForm.tsx         # Formulário de upload com OCR
│   ├── EncaminharModal.tsx    # Modal de encaminhamento de pasta
│   ├── PrintModal.tsx         # Modal de impressão
│   ├── PDFViewer.tsx          # Visualizador de PDF embutido
│   ├── ExportButton.tsx       # Botão de exportação de relatórios
│   └── ui/                    # Shims de @base-ui/react (button, dialog, select...)
├── proxy.ts                   # Proxy (middleware) com RBAC
├── .prettierrc
└── .prettierignore
```

---

## Início Rápido

### 1. Subir o banco de dados

```bash
npm run db:up          # Docker Compose — PostgreSQL
```

### 2. Variáveis de ambiente

Copie o `.env` (já existente no projeto) e ajuste se necessário:

```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/sadpf_db"
SADPF_SECRET="sua_chave_de_assinatura_jwt_com_minimo_32_caracteres"
APP_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
EMAIL_FROM="SADPF <acesso@sua-organizacao.gov.br>"
NODE_ENV=development
STORAGE_PROVIDER=local
```

### 3. Aplicar schema e seed

```bash
npm run db:push        # Aplica schema ao banco
npm run db:seed        # Cria usuário ADMIN e OPERADOR de teste
```

### 4. Rodar em dev

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Usuários de teste (seed)

| Usuário  | Matrícula  | CPF           | Role     | Senha          |
| -------- | ---------- | ------------- | -------- | -------------- |
| Admin    | `000001-1` | `12345678900` | ADMIN    | `123456Senha!` |
| Operador | `000002-2` | `12345678900` | OPERADOR | `123456Senha!` |

---

## RBAC — Controle de Acesso por Papel (Role)

O sistema possui três papéis definidos no enum Prisma:

| Role       | Descrição                        | Acesso                                                 |
| ---------- | -------------------------------- | ------------------------------------------------------ |
| `ADMIN`    | Administrador do sistema         | Todas as páginas                                       |
| `OPERADOR` | Operador do RH                   | Tudo **exceto** `/logs`, `/usuarios`, `/configuracoes` |
| `PASTA`    | Acesso somente à pasta funcional | Sem login no sistema (perfil de servidor)              |

### Como funciona

- **`proxy.ts`** (middleware do Next.js 16): intercepta todas as requisições. Para `OPERADOR`, bloqueia `/logs`, `/usuarios`, `/configuracoes` e `/api/logs` com redirect para `/dashboard`.
- **`app/components/Sidebar.tsx`**: busca a sessão via `/api/auth/session` e filtra os itens do menu por `adminOnly`.
- **`app/api/servidores/route.ts` (PUT)**: rota de atualização restrita a `ADMIN`. Inclui proteção contra auto-rebaixamento.

---

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (Turbopack)
npm run build        # Build de produção (prisma generate + next build)
npm run start        # Iniciar servidor de produção
npm run lint         # ESLint (.ts, .tsx)
npm run format       # Prettier — formata todos os arquivos
npm run db:up        # Docker Compose — sobe PostgreSQL
npm run db:down      # Docker Compose — desce PostgreSQL
npm run db:push      # Aplica schema Prisma ao banco
npm run db:seed      # Roda seed (cria usuários de teste)
npm run prisma:generate  # Gera Prisma Client
```

---

## Storage (Upload de PDFs)

O projeto suporta storage via variável de ambiente `STORAGE_PROVIDER`:

| Provider     | Descrição                                                                         |
| ------------ | --------------------------------------------------------------------------------- |
| `local`      | Arquivos privados em `storage/uploads/` (padrão)                                  |
| `supabase`   | Supabase Storage (requer `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `STORAGE_BUCKET`) |
| `s3`/`minio` | Storage compatível com S3 no servidor da Secretaria (requer as variáveis `S3_*`)  |

## Variáveis de Ambiente

| Variável               |   Obrigatória   | Descrição                                                       |
| ---------------------- | :-------------: | --------------------------------------------------------------- |
| `DATABASE_URL`         |       Sim       | URL de conexão PostgreSQL (Prisma)                              |
| `SADPF_SECRET`         |       Sim       | Chave HMAC-SHA256 para assinatura de JWT (mínimo 32 caracteres) |
| `APP_URL`              | Primeiro acesso | URL pública do SADPF usada no link enviado por e-mail           |
| `RESEND_API_KEY`       | Primeiro acesso | Chave da API do Resend                                          |
| `EMAIL_FROM`           | Primeiro acesso | Remetente verificado no Resend                                  |
| `NODE_ENV`             |       Não       | `development` / `production`                                    |
| `STORAGE_PROVIDER`     |       Não       | `local` (padrão), `supabase`, `s3` ou `minio`                   |
| `SUPABASE_URL`         |   Condicional   | URL do projeto Supabase (quando `STORAGE_PROVIDER=supabase`)    |
| `SUPABASE_SECRET_KEY`  |   Condicional   | Secret/service role key do Supabase                             |
| `STORAGE_BUCKET`       |       Não       | Bucket (padrão: `sadpf-documentos`)                             |
| `S3_ENDPOINT`          |   Condicional   | Endpoint S3/MinIO                                               |
| `S3_ACCESS_KEY_ID`     |   Condicional   | Chave de acesso S3/MinIO                                        |
| `S3_SECRET_ACCESS_KEY` |   Condicional   | Chave secreta S3/MinIO                                          |
| `S3_REGION`            |       Não       | Região S3 (padrão: `us-east-1`)                                 |
