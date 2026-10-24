# Changesets

Every `@fcalell/*` package is versioned in lockstep (`fixed` in `config.json`), so one changeset
bumps them all together.

Add a changeset with your change:

```bash
pnpm changeset
```

On `master`, the release workflow opens a "Version Packages" pull request that applies the pending
changesets (version bumps and changelogs). Merging it publishes to npm.

The private apps (`phone`, `showcase`) are ignored and never published.
