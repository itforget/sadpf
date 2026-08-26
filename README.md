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
│   │   ├── novo/page.tsx      #   Upload de PDFs
│   │   └── [id]/page.tsx      #   Detalhe
│   ├── usuarios/page.tsx      # Gerenciamento de usuários (ADMIN only)
│   ├── configuracoes/page.tsx # Configurações do sistema (ADMIN only)
│   ├── logs/page.tsx          # Trilha de auditoria (ADMIN only)
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
│   ├── search/route.ts        # Busca global rápida
│   └── health/route.ts        # Healthcheck
├── app/components/
│   ├── Sidebar.tsx            # Menu lateral (filtra itens por role)
│   ├── Topbar.tsx             # Barra superior (nome, role, logout)
│   ├── CapaPasta.tsx          # Componente da capa da pasta funcional
│   ├── DocumentCard.tsx       # Card de documento PDF
│   ├── UploadForm.tsx         # Formulário de upload de PDFs
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

Copie o `.env.example` para `.env` e ajuste os valores locais. Para produção, use o
gerenciador de segredos do provedor de deploy e **não** versione um arquivo `.env`.

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
npm run db:seed        # Cria o ADMIN inicial com as variáveis INITIAL_ADMIN_*
```

### 4. Rodar em dev

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Bootstrap do administrador

Antes de executar `npm run db:seed`, defina `INITIAL_ADMIN_NOME`,
`INITIAL_ADMIN_MATRICULA`, `INITIAL_ADMIN_CPF`, `INITIAL_ADMIN_EMAIL` e
`INITIAL_ADMIN_PASSWORD`. O seed cria apenas esse administrador e exige senha com no mínimo
12 caracteres; não existem credenciais de teste embutidas no projeto.

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

| Provider     | Descrição                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `local`      | Arquivos privados em `storage/uploads/` (padrão)                                                                     |
| `supabase`   | Supabase Storage com upload direto por URL assinada (requer `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `STORAGE_BUCKET`) |
| `s3`/`minio` | Storage compatível com S3 no servidor da Secretaria (requer as variáveis `S3_*`)                                     |

## Variáveis de Ambiente — produção

Cadastre estas variáveis no ambiente de produção. Nunca use variáveis com o prefixo
`NEXT_PUBLIC_` para segredos: esse prefixo torna o valor disponível no navegador.

| Variável           | Obrigatória | Descrição                                                                                                                                                                               |
| ------------------ | :---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`         |     Sim     | Defina como `production`. Provedores como Vercel normalmente fazem isso automaticamente.                                                                                                |
| `DATABASE_URL`     |     Sim     | Conexão PostgreSQL usada pelo Prisma. Use usuário próprio da aplicação, senha forte e TLS (`sslmode=require`) fora da rede local.                                                       |
| `SADPF_SECRET`     |     Sim     | Segredo HMAC do JWT, aleatório e com pelo menos 32 caracteres. Gere com `openssl rand -base64 48`. Não use `NEXTAUTH_SECRET` em instalações novas; ele é apenas compatibilidade legada. |
| `APP_URL`          |     Sim     | URL pública canônica, sem barra final; compõe links de primeiro acesso.                                                                                                                 |
| `RESEND_API_KEY`   |    Sim\*    | Chave do Resend. Obrigatória quando houver contas sem senha/primeiro acesso.                                                                                                            |
| `EMAIL_FROM`       |    Sim\*    | Remetente já verificado no Resend. Obrigatório junto da chave acima.                                                                                                                    |
| `TRUST_PROXY`      |   Sim\*\*   | Use `true` somente atrás de proxy/CDN confiável que limpa e regrava `X-Forwarded-For`; habilita rate limit por IP.                                                                      |
| `STORAGE_PROVIDER` |     Sim     | Escolha `supabase`, `s3`, `minio` ou `local`. Para produção, prefira storage gerenciado em vez de disco local efêmero.                                                                  |
| `STORAGE_BUCKET`   |     Não     | Nome do bucket; se omitido, usa `sadpf-documentos`. O bucket deve existir e ser privado.                                                                                                |

\* Pode ser omitida apenas se não houver fluxo de primeiro acesso por e-mail.

\*\* Em Vercel, Nginx ou Ingress configurado corretamente. Sem proxy confiável, omita ou use `false`.

### Supabase Storage

Obrigatórias quando `STORAGE_PROVIDER=supabase`:

| Variável              | Descrição                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`        | URL do projeto, por exemplo `https://seu-project-ref.supabase.co`.                                            |
| `SUPABASE_SECRET_KEY` | Chave secreta/server-side (ou `service_role` legada) do **mesmo projeto** da URL. Nunca a exponha ao cliente. |
| `STORAGE_BUCKET`      | Bucket privado que receberá os documentos.                                                                    |

O upload direto usa uma URL temporária assinada pelo servidor; não requer
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e evita expor a chave secreta ao navegador.

### S3 ou MinIO

Obrigatórias quando `STORAGE_PROVIDER=s3` ou `minio`:

| Variável               | Descrição                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `S3_ACCESS_KEY_ID`     | Chave de acesso do usuário com escopo restrito ao bucket.                             |
| `S3_SECRET_ACCESS_KEY` | Segredo correspondente.                                                               |
| `S3_REGION`            | Região; padrão `us-east-1`.                                                           |
| `S3_ENDPOINT`          | Endpoint do MinIO/S3 compatível. A implementação atual o exige inclusive para AWS S3. |
| `S3_FORCE_PATH_STYLE`  | Use `true` normalmente para MinIO; padrão `true`.                                     |

### Banco local por Docker e bootstrap inicial

| Variável                  | Quando usar       | Descrição                                                                            |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`       | `npm run db:up`   | Senha do PostgreSQL do `docker-compose.yml`; mantenha-a coerente com `DATABASE_URL`. |
| `INITIAL_ADMIN_NOME`      | `npm run db:seed` | Nome do administrador inicial.                                                       |
| `INITIAL_ADMIN_MATRICULA` | `npm run db:seed` | Matrícula do administrador inicial.                                                  |
| `INITIAL_ADMIN_CPF`       | `npm run db:seed` | CPF do administrador inicial.                                                        |
| `INITIAL_ADMIN_EMAIL`     | `npm run db:seed` | E-mail institucional do administrador inicial.                                       |
| `INITIAL_ADMIN_PASSWORD`  | `npm run db:seed` | Senha inicial, com no mínimo 12 caracteres. Remova-a do ambiente após o bootstrap.   |
