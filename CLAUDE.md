# @fcalell/stack

Shared packages for all @fcalell projects. SolidJS + Hono + Cloudflare stack.

## Packages

| Package | Purpose | Docs |
|---------|---------|------|
| `@fcalell/typescript-config` | tsconfig presets (base, solid-vite, node-tsx) | Config-only, no docs needed |
| `@fcalell/biome-config` | Shareable Biome formatter/linter config | Config-only, no docs needed |
| `@fcalell/db` | Drizzle ORM clients (D1/SQLite), `db-kit` CLI, Better Auth integration | @packages/db/README.md |
| `@fcalell/api` | API framework: procedure builder, auth/RBAC middleware, typed client | @packages/api/README.md |
| `@fcalell/ui` | Design system: SolidJS + Kobalte + Tailwind v4 + CVA | @packages/ui/README.md, component docs in `packages/ui/docs/*.md` |

## Commands

```bash
pnpm check            # Lint (Biome) + type-check all packages
```

## Consuming packages

Projects use `@fcalell/*` packages as workspace dependencies (local) or published packages (CI).

```json
{
  "dependencies": {
    "@fcalell/ui": "workspace:*"
  },
  "devDependencies": {
    "@fcalell/typescript-config": "workspace:*"
  }
}
```

> Coding conventions live in `.claude/rules/`.
