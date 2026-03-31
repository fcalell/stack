## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json — never a barrel index that re-exports everything.

Use `#` hash imports for internal paths within a package. Use subpath exports for the public API.

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config` — never define compiler options directly.

## Code style

Only comment non-obvious code; never use JSDoc.

Keep exports minimal — only expose what consumers actually need.

Prefer factory functions over classes for configuration (e.g., `createAuthClient()` not `new AuthClient()`).
