# Slot graph

The slot graph is the framework's only coordination mechanism. Every cross-plugin value travels
through a typed slot; the engine resolves the graph topologically, memoized once per command. This
file covers the semantics; authoring mechanics (how to declare, contribute, derive) live in
`.claude/playbooks/plugin-authoring.md`, and the full registry of first-party slots in
[slot-catalog](./slot-catalog.md).

## The four slot kinds

Declared via `slot.list`, `slot.map`, `slot.value`, or `slot.derived`. Each takes `{ source, name }`
for identity; `source` is the owning plugin's name.

```ts
slot.list<TItem>({ source, name, sortBy? })          // many contributions, concatenated (optionally sorted)
slot.map<TValue>({ source, name })                   // many contributions, keys merged, duplicate-key throws
slot.value<T>({ source, name, seed?, override? })    // 0..1 contribution; duplicate throws unless override:true
slot.derived<T, I>({ source, name, inputs, compute }) // computed from other slots; cycles caught at build time
```

- `list`: many contributions concatenated; optional `sortBy` gives deterministic ordering.
- `map`: many contributions merged; duplicate keys throw.
- `value`: at most one contribution; `seed` supplies the default when none lands; `override: true`
  lets a later contribution replace the seed/contribution (e.g. `solid.slots.homeScaffold`, which
  `plugin-solid-ui` overrides).
- `derived`: computed from other slots; the framework guarantees inputs are fully resolved before
  `compute` runs, and catches cycles at build time.

## Contributing vs deriving

**Contributing** pushes a value into another plugin's slot and returns a `Contribution<T>`:

```ts
api.slots.cors.contribute(async (ctx) => `http://localhost:${await ctx.resolve(self.slots.devServerPort)}`)
cloudflare.slots.bindings.contribute(() => ({ kind: "d1", binding: "DB_MAIN", databaseId: "..." }))
```

A contribution returning `undefined` is silently skipped: the canonical pattern for conditional
contributions (`if (!ctx.fileExists(...)) return undefined;`).

**Deriving** reads other slots as inputs:

```ts
slot.derived({
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => ({ trustedOrigins: inp.cors }),
})
```

## Why there's no ordering to think about

The slot graph derives execution order from data dependencies. A derived slot waits for its
`inputs`. A list slot waits for all contributions. A `cliSlots.artifactFiles` contribution that
resolves `api.slots.workerSource` waits for every contribution to `workerImports` /
`pluginRuntimes` / `callbacks` / `cors` to resolve first, including peer plugins' contributions.
There is no `after:`, no handler-firing order, no barrier event. If you find yourself wanting to
"run after plugin X did Y", declare a derived slot whose inputs include the value Y produced.

`requires: ["plugin"]` on a plugin definition is presence-only: it powers an actionable error when
a sibling is missing from the consumer's config. It never influences ordering.
