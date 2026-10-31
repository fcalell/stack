# Changesets

Every `@fcalell/*` package is versioned in lockstep (`fixed` in `config.json`), so one changeset
bumps them all together.

Add a changeset with your change:

```bash
pnpm changeset
```

To release from `master`: `pnpm version-packages` applies the pending changesets (version bumps
and changelogs) and the result is committed; `pnpm release:check` proves the tarballs; `pnpm
release` publishes. The order, the version rule and the one-copy peer rules are in
`docs/architecture/releasing.md`.

The private apps (`phone`, `showcase`) are ignored and never published.
