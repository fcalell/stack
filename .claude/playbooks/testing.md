# Testing

> **Load when:** writing or updating tests, verifying a change, or about to call work done. The
> per-change gate is `pnpm test` (vitest) + `pnpm check` (Biome lint + type-check); all must pass
> before a change is complete.

Vitest workspace at the root orchestrates per-package test projects. Tests live next to the code
they test as `*.test.ts` files.

**Test projects:** `packages/cli`, `plugins/cloudflare`, `plugins/db`, `plugins/auth`,
`plugins/api`, `plugins/vite`, `plugins/solid`, `plugins/solid-ui`, `tests/integration`.

## Principles

A test that passes while the production code is broken is worse than no test: it actively
misleads. Three rules keep tests honest:

- **Exercise the production entry point. Never replicate its orchestration in test setup.** If
  production runs `discoverPlugins → buildGraphFromConfig → resolve(rootSlot)`, the test takes a
  `StackConfig` (the same type `stack.config.ts` exports) and runs through the same path.
  Hand-building a graph from synthetic plugins, hand-feeding a derivation's `compute` synthetic
  inputs, or constructing slot values the resolver wouldn't produce decouples the test from
  reality: the bugs that matter live in the glue you just skipped. When you catch yourself writing
  test-setup code that mirrors production wiring, delete it and call the real thing.
- **Assert on outcomes, not on intermediate strings.** `expect(workerSource).toContain("callbacks")`
  can be green while the callback never fires at runtime. When the artifact is runnable, run it:
  spawn the CLI subprocess for `stack` commands, boot the emitted worker under miniflare for worker
  behavior, parse the emitted config and import it for type checks. String-level assertions are
  supporting evidence, not the primary assertion.
- **Arrange inputs the way consumers do.** Plugin arrays in `stack.config.ts` are consumer-ordered;
  tests that hand-order them for assertion convenience hide dependency-graph bugs. Use the public
  surface (`defineConfig`, `plugin`, the same loader `stack generate` uses) as your fixture
  boundary. Reordering `config.plugins` in any test should leave it green; the slot graph derives
  ordering from data dependencies, not array position.

When in doubt: if you deleted the test and kept the production change, would a real consumer still
succeed? If the test can pass on inputs a real consumer can't produce, it's not testing what you
think.

## Don't write low-value tests

Coverage is not the goal; catching regressions is. A test that can only fail when you rename an
identifier protects nothing and dilutes the signal of the suite. Before writing one, ask: **what
production bug would turn this red?** If the only answer is "renaming a symbol" or "deleting the
test's own input", don't write it. Prefer a few tests that each guard real behavior over
one-per-symbol coverage.

Do not write:

- **Constant / identity echoes.** Asserting a value the code merely declares and hands back:
  `slot.source === "auth"`, `config.__plugin === "vite"`, `runtime.name === "db"`, a plugin's
  `label`, the list of slots a plugin "owns", or a schema default restated (`secretVar` defaults to
  `"AUTH_SECRET"`). These re-type a literal and break only on rename.
- **Shape-only `typeof` checks.** `expect(typeof builder.use).toBe("function")` / "is defined" on a
  freshly constructed value. Lone exception: a single smoke test guarding a real construction path
  nothing else exercises (an import that pulls native modules, a proxy that materializes lazily),
  and only that one.
- **Tautologies.** Re-implementing the production logic in the test body and comparing, or
  asserting a factory returns exactly the literal it was handed (`accepts a custom port` → returns
  that port; `accepts routes config` → returns that config).
- **Generic framework behavior at the feature layer.** List/map slot concatenation, phase ordering,
  and order-independence are proven once in the engine's own tests (`slots.test.ts`,
  `graph.test.ts`). A plugin or command test that re-resolves a list slot just to watch
  contributions pile up adds nothing; assert *your* specific contribution and its effect, not that
  aggregation works.
- **The same behavior twice.** When a stronger sibling already covers it (a phase-sort test
  subsumes a plain-concat test; a full structural assertion subsumes a "has at least N imports"
  one), keep the stronger and delete the weaker.

The title must name a behavior the assertion actually verifies: `defaults prefix to /rpc` that
only asserts `_router` is defined is a lie; check the prefix or delete the test.

Litmus test: **if you deleted this test, what real consumer scenario would silently break?** No
answer → it's noise, not safety.

## Writing tests

- Co-locate test files: `src/foo.ts` → `src/foo.test.ts`
- Import from `vitest`: `import { describe, expect, it, vi } from "vitest"`
- Integration-level: drive `runStackGenerate({ config })` from `@fcalell/cli/testing`. It runs the
  same `generateFromConfig` the CLI calls, returns `{ files, postWrite }`.
- Unit-level on a slot: build a real graph with `buildTestGraph({ config })` or
  `buildTestGraphFromPlugins({ plugins: [...] })`, then `await graph.resolve(api.slots.cors)` and
  assert on the value. Allowed *in addition to* a full-path test, not *instead of* one.

```ts
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it } from "vitest";
import { db } from "./index";

describe("plugin-db cloudflare bindings", () => {
  it("contributes a d1 binding when dialect is d1", async () => {
    const { graph } = buildTestGraphFromPlugins({
      plugins: [
        { factory: cloudflare, options: {} },
        { factory: db, options: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" } },
      ],
    });

    const bindings = await graph.resolve(cloudflare.slots.bindings);

    expect(bindings).toContainEqual(
      expect.objectContaining({ kind: "d1", binding: "DB_MAIN", databaseId: "abc" }),
    );
  });
});
```

`createMockCtx({ options })` is available for the rare unit test that builds a `ContributionCtx`
directly. Use it sparingly: a mock ctx without `resolve` will explode on any contribution that
crosses slots, which is usually the bug you wanted to catch. Prefer real graphs.

## Development workflow

1. Write or update the implementation
2. Add/update tests covering the change; run `pnpm test` to verify
3. Run `pnpm check` (lint + type-check)

All three must pass before a change is considered complete.
