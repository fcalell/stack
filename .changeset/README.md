# Changesets

Every `@fcalell/*` package is versioned in lockstep (`fixed` in `config.json`), so one changeset
bumps them all together.

Add a changeset with your change:

```bash
pnpm changeset
```

To release from `master`: `pnpm version-packages` applies the pending changesets (version bumps
and changelogs), commit the result, then `pnpm release` builds every package and publishes to npm
(`npm login` first, or an `NPM_TOKEN`). A release workflow can take over both steps later.

The private apps (`phone`, `showcase`) are ignored and never published.
