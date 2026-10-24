# Contributing

Thanks for helping with `@fcalell/stack`.

## Setup

- Node 24 or newer.
- pnpm through corepack: `corepack enable`. The version is pinned by `packageManager` in
  `package.json`.
- POSIX shell tooling (Linux, macOS); Windows is untested.

```bash
pnpm install
pnpm check
```

`pnpm check` (type-check, tests, Biome lint) must pass before a change is complete. `pnpm lint`
applies Biome's fixes.

## Where things are

The monorepo has `packages/` (`@fcalell/cli`, `@fcalell/ui-core`, tsconfig and Biome presets),
`plugins/` (one `@fcalell/plugin-<name>` per domain) and `apps/` (`showcase` and `phone`, private
consumers). `pnpm stories` opens the roster's Storybook.

Read before you change code (the same list as in `CLAUDE.md`):

- `docs/product.md`, the philosophy. A new consumer-facing option or public surface is the last
  resort.
- `docs/architecture/overview.md`, then `docs/architecture/conventions.md` before editing
  TypeScript.
- `docs/architecture/plugin-authoring.md` and `docs/architecture/slot-catalog.md` before writing a
  plugin. A slot added, renamed, removed or reshaped updates the catalog in the same commit.
- `packages/ui-core/guide/structure.md` before editing a ui component.

## Commits and pull requests

- The commit scope is the package, like `plugin-auth`: `fix(plugin-auth): reject expired codes`.
- Add a changeset for a user-facing change with `pnpm changeset`. All `@fcalell/*` packages are
  versioned together.
- Fill in the pull request template.

## Security

Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## License

By contributing you agree your contribution is licensed under the [MIT License](LICENSE).
