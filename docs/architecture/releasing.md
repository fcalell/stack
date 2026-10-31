# Releasing

How the packages reach the npm registry, and how a consumer moves from a git pin to a version.
The owner publishes; nothing in the repository logs in to npm or publishes on its own.

## What is published

Fifteen packages, all `@fcalell/*`, all at one version:

| Package | Directory | A consumer installs it because |
|---------|-----------|--------------------------------|
| `@fcalell/cli` | `packages/cli` | the `stack` binary and the slot graph; every app's devDependency |
| `@fcalell/ui-core` | `packages/ui-core` | the design contract; both UI plugins depend on it and the guide index lists its pages |
| `@fcalell/typescript-config` | `packages/typescript-config` | the scaffold's `tsconfig` presets (every app's devDependency) |
| `@fcalell/biome-config` | `packages/biome-config` | the scaffold's Biome preset (every app's devDependency outside stack's workspace) |
| `@fcalell/plugin-api`, `-auth`, `-cloudflare`, `-db`, `-expo`, `-native-ui`, `-node`, `-react`, `-react-ui`, `-screens`, `-vite` | `plugins/<name>` | one per domain, named in `stack.config.ts` |

Private, never published: the root (`@fcalell/stack`) and the two apps, `apps/showcase` and
`apps/phone`, which are stack consumers inside the checkout (`.changeset/config.json` ignores
them). The two presets are public although only a devDependency: `stack init` writes both into
every app's `package.json`, and `.stack/biome.json` extends the Biome one.

A tarball holds what its `files` lists and nothing more: `dist/` (JavaScript with `.d.ts` and
maps), `src/` (the entries a bundler compiles resolve to it, `ui-core`'s guide sends a reader to
`src/roster.ts`, and the maps point into it), `guide/*.md` (a consumer's `stack generate` indexes
them), `DESIGN.md` for ui-core, `templates/` and `lint/` where a plugin scaffolds or contributes
them, the README and the LICENSE. Test files, `tsconfig*.json` and ui-core's maintainer scripts
stay out. Every entry Node loads resolves through `exports` into `dist/` (Node refuses to strip
types under `node_modules`); only `.tsx`, `.css` and `src/ui/` entries resolve to source
(`conventions.md`, "Build and exports").

## The version rule

- **One version for every public package** (`fixed` in `.changeset/config.json`). A release
  publishes all fifteen or none; never a subset.
- **Stack-to-stack ranges are carets of that version.** A package depends on another with
  `workspace:^`, which `pnpm pack` and `pnpm publish` write as `^<version>`. On `0.x` a caret
  holds the minor (`^0.1.0` is `>=0.1.0 <0.2.0`), so a breaking change bumps the minor and
  everything else the patch, until `1.0.0`; then semver.
- **A consumer's specs are `^<the CLI's version>`.** `stack init` and `stack add` write them
  from the CLI's own `package.json` (`stackSpec`), and its lockfile is the pin.
- **The bump goes through changesets.** `pnpm changeset` with each user-facing change; at
  release time `pnpm version-packages` applies the pending ones (versions and changelogs),
  and the result is committed on `master`. The first release, `0.1.0`, needs no changeset: the
  manifests are already at it.

## Peers: one copy of each stack package

A consumer must end with exactly one copy of each stack package, or its slots split
(`Slot 'api:envType' is defined twice: two copies of its package are installed`). pnpm makes one
instance of a package per set of resolved peers, so a peer that resolves differently in two
places turns one `@fcalell/plugin-api` into two, and every stack package above it into two.
The rules that prevent it:

1. **A stack package depends on another stack package, never peers on it.** The ranges are
   lockstep carets, so one install holds one version.
2. **A stack package's own peers are third-party and optional** unless the plugin cannot work
   without them (`react`, `@tanstack/react-query`, `@orpc/tanstack-query`, Expo's modules). A
   consumer's root resolves each once.
3. **A third-party dependency's optional peer that a consumer's tree can hold in two versions
   becomes a direct dependency of the stack package.** `@orpc/server` has an optional peer `ws`;
   wrangler's miniflare pins `ws` exactly while Storybook and Vitest take the newest, so an app
   with a worker held two `ws`, pnpm resolved `@orpc/server`'s peer to either by context, and
   `plugin-api`, `plugin-auth` and `plugin-screens` (each depends on `@orpc/server`) and every
   package above them each existed twice. Each of the three lists `ws: ^8.21.1`, which settles
   the peer inside the package. When `stack generate` names a slot defined twice after an
   install, look for the next peer of this kind: compare the parenthesised suffixes of the
   duplicated keys in the lockfile's `snapshots:`; the one that differs is the peer.

Count the copies in any consumer, from its root; each stack package must show `1`:

```bash
awk '/^snapshots:/{s=1} s && /^  .?@fcalell\//' pnpm-lock.yaml \
  | sed -E "s/^  '?(@fcalell\/[a-z-]+)@.*/\1/" | sort | uniq -c
```

## The check

`pnpm release:check` (`scripts/release-check.ts`) proves the tarballs, with no server and no
login. It builds, packs the fifteen packages, and checks each tarball (MIT, a LICENSE, a
`repository.directory`, `publishConfig.access: public`, no `workspace:` range left, no test file,
every `exports` and `bin` target present). It then makes three consumers with `stack init`
(a worker web app, a Node-target web app, a native app), each installing **only** from the
tarballs (`overrides` to `file:` tarballs in the consumer's `pnpm-workspace.yaml`, which is what
the registry will serve), runs `stack generate`, `stack build` and `tsc -b` on them (the native
one generates only), counts the copies of each stack package in the lockfile, and ends with
`pnpm -r publish --dry-run`. Its logs, tarballs and consumers land in a fresh directory it
prints; `--only web,node,native` narrows the consumers, `--keep` keeps their `node_modules`.

Known: a native app that uses `auth()` fails `tsc -b` on `@fcalell/plugin-auth/src/expo.tsx`
until it installs `expo-apple-authentication` and `@react-native-google-signin/google-signin`
(optional peers whose types that source entry imports), which is why the check leaves the native
consumer's type check out.

## Publishing

Once, on the machine that publishes: `npm login` as the account that owns the `@fcalell` scope
(two-factor on; `pnpm` forwards npm's one-time-password prompt).

```bash
git switch master && git pull --ff-only          # a clean tree on master: publish refuses otherwise
pnpm install --frozen-lockfile
pnpm version-packages                            # only after a first release; commit the bump
pnpm turbo run build                             # JavaScript and .d.ts into every dist/
pnpm check                                       # the gate
pnpm release:check                               # tarballs, three consumers, the dry run
pnpm -r publish --dry-run                        # the dry run alone, with the git checks on
pnpm release                                     # pnpm -r publish --access public
git tag "v$(node -p "require('./packages/cli/package.json').version")"
git push --follow-tags
```

`pnpm -r publish` goes in dependency order and skips a version the registry already holds, so
after a failure part-way (a dropped connection, an expired one-time password) the same command
resumes. `prepare` and `prepublishOnly` rebuild each `dist/` as it is packed.

Then, from an empty directory, the README's route: `pnpm add -D @fcalell/cli`, then
`pnpm exec stack init my-app`, which must install, generate and finish. A bad release is not
unpublished; the next patch fixes it.

## Moving a consumer from a git pin to a version

A consumer that pinned a commit (`github:fcalell/stack#<sha>&path:/plugins/db`) moves to the
version once the registry holds it. In its `package.json`, every `@fcalell/*` spec in
`dependencies` and `devDependencies` becomes the caret of the release:

```diff
-"@fcalell/plugin-db": "github:fcalell/stack#55a1add…&path:/plugins/db",
+"@fcalell/plugin-db": "^0.1.0",
```

In its `pnpm-workspace.yaml`, delete what only the git route needed, and keep the third-party
verdicts:

- the `overrides` entries naming `@fcalell/*`;
- `blockExoticSubdeps: false`;
- the `allowBuilds` keys of the form `"@fcalell/<name>@git+https://github.com/fcalell/stack.git": true`;
- `childConcurrency` and `networkConcurrency` when they were set for the git prepares.

Then `pnpm install`, and check that the lockfile holds no `github.com/fcalell/stack` entry and one
copy of each stack package (the command above), run `stack generate`, and run the consumer's
`pnpm check`. From then on `pnpm update "@fcalell/*"` moves every stack package together; a
review round that fixes stack links a checkout instead (`consumer-project.md`, "From a
checkout"), and the pin moves to the next version, not the next commit.
