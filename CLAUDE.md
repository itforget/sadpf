@AGENTS.md

# SADPF — Instruções de Projeto

Sistema de arquivo digital de pastas funcionais da **SSP-DF**. Next.js 16 (App Router) + TypeScript + Prisma v7 + PostgreSQL. Documentação completa em `README.md`.

## Regras de trabalho

### Verificação obrigatória antes de terminar

```bash
npm run lint      # 0 erros, 0 warnings esperado
npm run format    # Prettier (singleQuote, es5 trailingComma, printWidth 100)
npm run build     # Deve compilar (prisma generate + next build)
```

Se o lint acusar regras do React Compiler (`react-hooks/*`), siga a tabela de correções em `AGENTS.md`.

### Não edite arquivos gerados

- `prisma/generated/` — output do Prisma Client
- `next-env.d.ts`
- `.next/`, `node_modules/`, `public/uploads/` (estão no `.prettierignore`)

Alterou `prisma/schema.prisma`? Rode `npm run prisma:generate` (e `npm run db:push` para aplicar no banco local).

### Arquitetura a seguir

- **Páginas**: `app/<rota>/page.tsx`. Componentes com estado/efeitos → `'use client'`. Sem estado → server component.
- **Componentes de UI**: shims em `app/components/ui/` (`@base-ui/react`). Reuse-os; não importe `@base-ui/react` diretamente.
- **Validação**: schemas Zod em `lib/validations/<dominio>.ts`, resolvidos com `zodResolver` no `react-hook-form`.
- **Acesso ao banco**: funções em `lib/server/db.ts`, sempre via o Prisma singleton de `lib/server/prisma.ts`.
- **Auth/RBAC**: sessão via `getSessionFromToken()` de `lib/server/auth.ts` (cookie `sadpf_session`, JWT HMAC). Toda rota de API mutante deve revalidar a role; rotas restritas precisam de `adminOnly` na Sidebar **e** bloqueio no `proxy.ts`.

### Convenções de código

- Formulários: `react-hook-form` + `useWatch({ control, name })` (não `watch()`), `zodResolver`.
- Tailwind: use tokens semânticos (`bg-card`, `text-foreground`, `bg-ssp-blue`); `cn()` para classes condicionais.
- Botões/link como âncora: `buttonVariants()` em `<Link>` (não existe `asChild` na Base UI).
- Mensagens de UI em **português** (pt-BR).
- Commits/mensagens: concisas, pt-BR quando apropriado.

## Contexto rápido

- Roles: `ADMIN` (tudo), `OPERADOR` (tudo menos `/logs`, `/usuarios`, `/configuracoes`), `PASTA` (sem login).
- Usuários de teste (seed): ADMIN `000001-1` / CPF `12345678900`, OPERADOR `000002-2` / CPF `12345678900` — senha `123456Senha!` para ambos.
- Rodar em dev: `npm run dev` (requer Postgres em `npm run db:up`).
