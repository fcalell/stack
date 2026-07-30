# PRD — plugin-native-updates: over-the-air JS updates for the native app

Source: sailward's OTA subsystem, a self-hosted Hot Updater deployment on Cloudflare that ships
JavaScript bundle updates to installed builds without an app-store release. It spans a standalone
backend worker (`apps/ota`), the mobile client config (`apps/mobile/hot-updater.config.ts`), and the
publish/rollout/prune/parity operations in `tools/release`. Stack has no equivalent today.

## Name

**`plugin-native-updates`.** It states the job (update the installed native app) and joins the
`native-*` family with `plugin-native-ui`. Rejected alternatives: `plugin-ota` (jargon),
`plugin-live-updates` (collides with realtime/live-query wording). The namespaced alternative
`plugin-expo-updates` is viable if you prefer the coupling to the native domain explicit; decide
before the first milestone since the package name is a durable surface.

## Scope

**In:**

- A `plugin-native-updates` owning the live-update domain end-to-end, backed by Hot Updater on
  Cloudflare, isolated from the main worker (its own D1, R2, and hostname) so an update outage never
  touches the API.
- Backend worker generation: the Hot Updater reference worker (update-check API plus a JWT-signed R2
  pass-through), emitted as a deploy target with its own bindings and migrations.
- Mobile client wiring: the Hot Updater config and client runtime, auto-wired into `plugin-expo`
  with the fingerprint update strategy so a bundle can never reach a build whose native side
  drifted.
- Deploy integration: an OTA publish step, plus a fingerprint-parity gate, both riding the
  [`deploy-engine`](./deploy-engine.md) surfaces.
- Bundle lifecycle as plugin subcommands: rollout ramp, enable, disable, force-update, prune
  superseded bundles.

**Out:**

- Native store builds and submission (EAS). That is `plugin-expo`'s deploy surface and pairs with the
  shipped client version gate (`plugin-expo`).
- The reconcile, lock, and TUI engine (deploy-engine PRD). This plugin consumes them.
- Hot Updater's admin/console routes on the public worker (sailward keeps them off; the CLI talks to
  D1 and R2 directly).
- Named OTA channels beyond a single configured channel in v1. Multi-channel is a later revisit.

## Surfaces touched

- New `plugins/native-updates/`. `requires: ["expo", "cloudflare"]`.
- `cloudflare.slots.bindings`: contribute the update backend's D1 (`DB`) and R2 (`BUCKET`) bindings.
- `cloudflare.slots.routes`: contribute the update backend's custom-domain route (the URL is baked
  into every build, so it must be a durable own-zone hostname, per sailward's wrangler note).
- `cloudflare.slots.secrets`: `JWT_SECRET` for signed bundle URLs.
- `cliSlots.artifactFiles`: the backend worker source and the mobile `hot-updater.config.ts`.
- `cliSlots.deploySteps`: the OTA bundle publish step.
- `cliSlots.deployChecks`: the fingerprint-parity gate as a blocking check (depends on deploy-engine
  M3).
- `plugin-expo` client integration: stamp the update runtime and the backend URL into the app build.
- Plugin subcommands (`commands` on the `plugin()` contract) for the bundle lifecycle operations.
- Config option `nativeUpdates({ channel?, hostname })`: the channel and the backend hostname are
  legitimate consumer options (product/DNS decisions with no safe default for the hostname).

## Milestones

Ordered by dependency. Each is independently shippable. Each **Verify** block is a manual procedure
against a scratch consumer project with `nativeUpdates()` configured: run the commands, read the
named artifact or response, confirm the stated result.

### M1 — Update backend as a deploy target

Generate the Hot Updater Cloudflare worker (update-check API plus JWT-signed R2 pass-through, admin
routes off) with its own D1 and R2 bindings and vendored migrations, isolated from the main worker.
It deploys through the existing `wrangler deploy` path (a `deploySteps` entry) and migrates through
the existing D1 migration path.

**Verify.** Run `stack generate` and read `.stack/`: the backend worker source is emitted, and the
wrangler config carries the `DB` and `BUCKET` bindings plus the custom-domain route, separate from
the main worker. Deploy it against throwaway Cloudflare resources, apply the vendored migrations,
then curl the update-check endpoint: it answers from D1 and the returned signed URL streams the
bundle. Confirm the admin routes return 404.

### M2 — Mobile client wiring

Generate `hot-updater.config.ts` (fingerprint update strategy, R2/D1 deploy credentials from a
gitignored env file, optional Sentry source-map upload when a token is present) and wire the client
runtime into `plugin-expo` so the app checks the backend at launch. The backend URL is stamped into
the build automatically.

**Verify.** Run `stack generate` and read `hot-updater.config.ts`: it selects the fingerprint
strategy and reads its R2/D1 credentials from the gitignored env file. Confirm that file is
gitignored. Build the app, launch it against the deployed backend, and confirm it checks for an
update at launch with the stamped backend URL. Drop `nativeUpdates()` from the config, regenerate,
and confirm the update runtime is gone from the build.

### M3 — OTA publish deploy step

Contribute a `deploySteps` entry that builds and publishes the JS bundle for the configured channel.
Publishing runs after the backend and the app-facing worker in the deploy order (veterans get the
fix before a store build embeds the same commit), matching sailward's leg order.

**Verify.** Run `stack deploy` and watch the step order: the publish step runs after the backend and
the app-facing worker. Query the backend's D1 afterwards and confirm the bundle is recorded against
the configured channel. Relaunch the installed app and confirm it picks the new bundle up.

### M4 — Fingerprint-parity gate

Contribute a blocking `deployChecks` entry (deploy-engine M3) that refuses to publish a bundle whose
native fingerprint does not match the target build's, so a bundle can never reach a build whose
native side drifted. Sailward computes this by prebuilding at the commit in a temp worktree and
comparing canonicalized native inputs (`parity.ts`); port the comparison, keeping its pbxproj
id-canonicalization so a benign prebuild re-run does not false-flag.

**Verify.** Run `stack deploy` twice with no native changes in between, re-running the prebuild each
time: the gate passes both times, so a benign pbxproj id renumber does not false-flag. Add a native
dependency and deploy against the older build: the gate blocks the publish and names the drift.
Rebuild the app at that commit and confirm the same deploy proceeds.

### M5 — Bundle lifecycle subcommands

Expose the bundle operations as `plugin-native-updates` subcommands: rollout ramp, enable, disable,
force-update, and prune superseded bundles. Prune deletes a bundle's own R2 objects and its D1 row,
never a shared content-addressed asset, and deletes objects before the row so a failed run retries
cleanly (sailward's `prune.ts` ordering).

**Verify.** Against the deployed backend, ramp a rollout and confirm the D1 row reflects the new
percentage. Disable a bundle and confirm the app stops receiving it; re-enable and confirm it
returns. Force-update and confirm the app applies the bundle at launch. Publish a superseding
bundle, prune, and confirm the old bundle's R2 objects and D1 row are gone while a
content-addressed asset shared with the live bundle survives. Interrupt a prune mid-run, re-run it,
and confirm it completes.

## Non-goals

- No app-store build or submit here (WS4 / `plugin-expo`).
- No multi-channel management in v1.
- No exposure of `@hot-updater/*` to the consumer. Wrapped, never imported directly, same rule as
  drizzle, hono, and zod.

## Acceptance

Per milestone: the implementation lands, the milestone's **Verify** steps run green against a
scratch consumer project and throwaway Cloudflare resources with the transcript recorded in the PR,
`pnpm check` passes, and the plugin README documents the `nativeUpdates` option and the lifecycle
subcommands. The dogfood signal: sailward could delete
`apps/ota`, `hot-updater.config.ts`, and the OTA half of `tools/release`, and get the same behavior
from `plugin-native-updates`.
