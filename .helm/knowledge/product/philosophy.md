# Philosophy

`@fcalell/stack` is a full-stack framework for SolidJS + Hono + Cloudflare. It ships everything a
consumer needs to build and deploy a production app (database, API, UI, tooling) so they only write
business logic. Every design decision is judged against the five pillars below.

## The consumer writes only business logic

Plugins wrap their domain (Drizzle, Hono, oRPC, Kobalte, Vite, Tailwind) and re-export only what's
needed. Consumers don't install or import `drizzle-orm`, `hono`, `zod`, `@kobalte/core`, `vite`, or
`tailwindcss` directly, and they don't hand-write glue code, boilerplate config, or wiring. If a
value can be generated, inferred, defaulted, or auto-wired, a plugin must do it behind the scenes. A
new consumer-facing option is the last resort, not the first.

## Everything is opt-in and composable

A project can use just the UI, just the database, or the full stack. Plugins declare typed slot
contributions; the framework resolves dataflow once per command. There is no plugin firing order to
think about: data dependencies are the order, and the bug class of ordering surprises is
structurally dead (see [slot-graph](../architecture/slot-graph.md)).

## CLI orchestrates; plugins contribute independently

`@fcalell/cli` owns the lifecycle (init/dev/build/deploy), the slot graph engine, and
`stack.config.ts`, nothing else. Codegen surfaces are typed slots defined on the owning plugin:
`api.slots.workerSource`, `cloudflare.slots.wranglerToml`, `vite.slots.viteConfig`,
`solid.slots.entrySource` / `htmlSource` / `providersSource` / `routesDtsSource`,
`solidUi.slots.appCssSource`. CLI-level lifecycle slots (`cliSlots.artifactFiles`,
`cliSlots.devProcesses`, …) are the cross-cutting sinks every command consumes. Plugins never import
each other to coordinate; they contribute typed values to one another's slots and read shared values
via derived slots. Cross-plugin handoff happens through the slot graph, never via shared mutable
state.

## Plugins share one contract

Every plugin, first-party or third-party, is built with `plugin()`, declares typed `slots`,
contributes typed payloads, and speaks the same AST-spec vocabulary. A third-party plugin (e.g.
`@acme/stack-plugin-widget`) composes cleanly with the official ones: same factory, same slot
system, same dependency rules. When extending the framework, extend that shared interface; don't
ship a new one.

## Features live in the plugin that owns the domain; core stays domain-agnostic

`@fcalell/cli` does not know what fonts, auth, or schemas mean. Typography options go on
`plugin-solid-ui`; CORS on `plugin-api`; tables on `plugin-db`; HTML `<head>` metadata on
`plugin-solid`. The top-level `app` field is strictly cross-cutting identity (`name`, `domain`):
values consumed by more than one plugin. If a field only makes sense for one plugin's domain, it
belongs on that plugin's options, not on `app`. Domain types (`FontEntry`, `AuthProvider`, etc.)
must not leak into `@fcalell/cli`.

Quick test: if removing a feature would require changes to `@fcalell/cli`, the feature is in the
wrong place.
