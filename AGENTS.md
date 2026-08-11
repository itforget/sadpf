<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Library version gotchas

Read these before assuming an API exists or a dependency behaves like its stable version.

## `@base-ui/react` v1.7 — NOT Radix UI

- There is **no `asChild` prop** on `Button` or other components. To render a component as a link, use the `render` prop (`<Button render={<Link href="..."/>}>`), or apply `buttonVariants()` from `class-variance-authority` directly to a `<Link>`.
- Dialog, Select, etc. come from `@base-ui/react` (often re-exported through `app/components/ui/*`). Check those shims before importing from the base package.

## Zod v4 — not v3

- `z.enum(["A", "B"], { message: "..." })` — no `{ required_error }` (that's v3).
- Validation errors live at `result.error.issues`, not `result.error.errors`.
- `z.email()` is a top-level helper (not `z.string().email()`).

## react-hook-form v7 — React Compiler friendly

- Use `useWatch({ control, name })` instead of `watch()`. The compiler's `react-hooks/incompatible-library` rule flags `watch()`.
- Wrap form in `<form onSubmit={handleSubmit(onSubmit)}>` — never use `action`-style server forms in client components.

## React Compiler ESLint rules are strict

The project enforces `eslint-plugin-react-hooks` (react-compiler mode). Common failures and fixes:

| Rule                               | Trigger                                               | Fix                                                                       |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `react-hooks/incompatible-library` | `watch()` from react-hook-form                        | use `useWatch({ control, name })`                                         |
| `react-hooks/set-state-in-effect`  | `setState(...)` synchronously inside `useEffect` body | use a `cancelled` flag with `.then()` callbacks, or compute during render |
| `react-hooks/purity`               | `Math.random()`, `Date.now()` etc. in component body  | extract to module scope or into an event handler                          |
| `react-hooks/refs`                 | accessing a `useRef` value during render              | read refs only inside effects/handlers                                    |

## Prisma v7 — custom client

- Client is generated to `./prisma/generated` (see `prisma/schema.prisma` for the generator config), not `@prisma/client`'s default output.
- Uses `@prisma/adapter-pg`. Import the singleton from `lib/server/prisma.ts`.
- Run `npm run prisma:generate` after editing `prisma/schema.prisma`.

## Auth — custom JWT, not next-auth

- HMAC-SHA256 signed JWT in an HTTP-only cookie `sadpf_session` (8h expiry). Signing/verification lives in `lib/server/auth.ts`.
- Session is read by `getSessionFromToken()`; only `ADMIN` and `OPERADOR` roles are accepted for the system session.
- Login route: `app/api/auth/login/route.ts`. Session/logout: `app/api/auth/session/route.ts`.
- Never store `sadpf_session` in a non-HTTP-only cookie.

## RBAC — three roles

- `ADMIN` — full access. `OPERADOR` — everything except `/logs`, `/usuarios`, `/configuracoes` and `/api/logs`. `PASTA` — no system login.
- Enforcement lives in **two places**: `proxy.ts` (server-side redirect) and `app/components/Sidebar.tsx` (menu filtering via `adminOnly` flag). Both must stay in sync when adding restricted routes.
- API mutating routes must also check the role server-side (see `app/api/servidores/route.ts` PUT).

## Styling

- Tailwind CSS 4. Use semantic tokens from `globals.css` (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-ssp-blue`, `text-status-success/danger`, etc.) — not raw colors.
- `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classnames.
- Button variants via `buttonVariants()` (cva) exported from the ui shim.
- Prettier is configured: `singleQuote: true`, `trailingComma: "es5"`, `printWidth: 100`. Run `npm run format` before finishing work.

## proxy.ts (Next.js 16 middleware)

- Middleware file is `proxy.ts` at project root, **not** `middleware.ts`.
- Signature: `export default function proxy(request: NextRequest)`. Read the docs in `node_modules/next/dist/docs/` before modifying.
