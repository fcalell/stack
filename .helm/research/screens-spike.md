# Screens workbench spike (2026-10-06)

Evidence for story 007-01 (`.helm/board/epics/007-consumer-screens/01-serve-screens.md`), whose
decisions this spike settled. A throwaway Storybook in `apps/showcase` proved both risks: MSW
answers oRPC's wire format from fixtures typed by the router, and a Storybook config rendered from
`vite.slots.*` renders real routes through the app's TanStack router. Ten stories (two routes ×
five states) ran in parallel in one Vitest browser run, all passing on three runs, with no
handler leaking between pages. The spike's code is gone; what it proved is below.

## Versions

Stack is on oRPC 1.14.4. oRPC's current docs describe v2 (`RPCSerializer`,
`@orpc/experimental-msw`), which does not apply: `@orpc/experimental-msw` exists only as
`2.0.0-beta.*` and needs `RPCHandler` with a runtime router, which the browser never has. Used:
`msw@2.15.0`, `msw-storybook-addon@3.0.3` (peer `msw>=2`, `storybook ^9||^10||^11`; v3 loads with
`import { mswLoader } from "msw-storybook-addon/csf3"`, `loaders: [mswLoader()]`, resets handlers
per story and applies `parameters.msw.handlers`), `@orpc/server`, `@orpc/client`,
`@orpc/standard-server-fetch` pinned to 1.14.4. MSW's worker file (`mockServiceWorker.js`, from
`msw init`) must be served; the plugin serves it from its package rather than the consumer's
`public/`.

## Fixtures typed by the router

The generated `AppRouter` is made of stack's branded `Procedure<TIn, TOut>`
(`@fcalell/plugin-api/types`), so the type needs no runtime router:

```ts
import type { Procedure } from "@fcalell/plugin-api/types";

export type Fixtures<TRouter> = {
	[K in keyof TRouter]?: TRouter[K] extends Procedure<infer I, infer O>
		? (input: I) => O
		: TRouter[K] extends Record<string, unknown>
			? Fixtures<TRouter[K]>
			: never;
};

export function defineFixtures<TRouter>(fixtures: Fixtures<TRouter>): Fixtures<TRouter> {
	return fixtures;
}
```

A wrong output or input shape is a type error (`TS2322 … Property 'name' is missing`), proven by
`// @ts-expect-error` lines `tsc` accepted. Each procedure is optional, so a missing one is a
visible gap at runtime, not a compile error.

## Answering `/rpc` in oRPC's wire format

oRPC's own server codec, the one `RPCHandler` builds, so envelope, status and headers are exact
and `createClient` + `orpc.<ns>.<proc>.queryOptions` decode them unchanged. The default client
sends `POST /rpc/<ns>/<proc>`; input rides a POST body `{ json, meta }` or GET `?data=`.

```ts
import { ORPCError } from "@orpc/client";
import { StandardRPCJsonSerializer, StandardRPCSerializer } from "@orpc/client/standard";
import { StandardRPCCodec } from "@orpc/server/standard";
import { toFetchResponse } from "@orpc/standard-server-fetch";
import { delay, http } from "msw";

const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer());
const codec = new StandardRPCCodec(serializer);
// `encode` takes a procedure argument it never reads.
const reply = (output: unknown) => toFetchResponse(codec.encode(output, undefined as never));
const replyError = (error: ORPCError<string, unknown>) => toFetchResponse(codec.encodeError(error));

async function inputOf(request: Request): Promise<unknown> {
	const raw = request.method === "GET"
		? new URL(request.url).searchParams.get("data")
		: await request.text();
	return raw ? serializer.deserialize(JSON.parse(raw)) : undefined;
}

// One catch-all: the path after `/rpc/` is split and looked up in the fixture tree.
http.all("*/rpc/*", async ({ request }) => {
	const path = new URL(request.url).pathname.replace(/^.*?\/rpc\//, "").split("/");
	if (state === "loading") return void (await delay("infinite"));
	if (state === "error") return replyError(new ORPCError("INTERNAL_SERVER_ERROR"));
	if (state === "notFound") return replyError(new ORPCError("NOT_FOUND"));
	const leaf = lookup(fixtures, path);
	if (!leaf) return replyError(new ORPCError("NOT_IMPLEMENTED", { message: `no fixture for ${path.join(".")}` }));
	const output = leaf(await inputOf(request));
	return reply(state === "empty" ? emptyOf(output) : output);
});
```

| State | Answer | The client reads |
|---|---|---|
| data | `fixture(input)` | the result |
| loading | `await delay("infinite")` | `status: "pending"` holds (checked 2.5 s later) |
| error | `ORPCError("INTERNAL_SERVER_ERROR")` | `error.code === "INTERNAL_SERVER_ERROR"`; a raw `Response("boom", { status: 500 })` decodes to the same |
| not found | `ORPCError("NOT_FOUND")` | `error instanceof ORPCError && error.code === "NOT_FOUND"`, status 404 |
| empty | `emptyOf(fixture(input))` | an array `[]`; a `{ data, nextCursor }` page with no items |

- Not found: stack has no shared helper; its own check is that expression
  (`plugins/api/src/ability-client.ts`). One exported helper belongs beside the client.
- Empty is derived from the fixture's value at runtime: the browser holds only the router's type,
  no schema, and stack's paginated envelope is always `{ data, nextCursor }` (`PaginatedResult`,
  `plugins/api/src/lib/cursor.ts`). A record has no empty form and shows its data. A list nested
  deeper would need an explicit empty form; none was needed.
- MSW's `onUnhandledRequest: "error"` catches requests outside `/rpc` and `/api/auth`.
- The client's entity-header capture (`captureEntityHeaders`, inside a try/catch) is unaffected by
  answers without `x-stack-reads`.
- better-auth's session is `GET */api/auth/get-session` answering `{ session, user }` (`null` signed
  out); `useSession()` from `@fcalell/plugin-auth/client`'s `createAuthClient` sees the user.

## A Storybook config from vite's slots

Resolving the slots outside `stack generate` works:

```ts
import { buildGraphFromConfig } from "@fcalell/cli/build-graph";
import { vite } from "@fcalell/plugin-vite";
const { graph } = await buildGraphFromConfig({ config, cwd });
await graph.resolve(vite.slots.pluginCalls); // configImports, resolveAliases, resolveDedupe,
// devServerPort, outDir, serverProxy, fsAllow, watchIgnored
```

The values are AST specs (`TsExpression`, `TsImportSpec`), so rendering them needs plugin-vite's
renderer, `aggregateViteConfig` in `plugins/vite/src/node/codegen.ts`, which is not exported (the
spike reached it by relative path; story 007-01 has it exported). Rendered with
`clientHeaders: {}`, the output differs from `.stack/vite.config.ts` only in having no
`server.headers`; `fsAllow` already came out right. With the TanStack router plugin kept, Storybook
and Vitest both start on it (`framework.options.builder.viteConfigPath`), and the router plugin
regenerates `.stack/routeTree.gen.ts` itself when a route is added. The only host-only plugin the
spike needed is the dependency optimizer start, because Storybook runs Vite in middleware mode:

```ts
configureServer(server) { void server.environments.client.depsOptimizer?.init(); }
```

- The router plugin resolves `routesDirectory: "../src/app/routes"` against Vite's `root`, so a
  resolution pass with root at the app logs `ENOENT scandir '.../apps/src/app/routes'` (non-fatal
  in Storybook dev, one Vitest pass), and moving `root` off `.stack/` breaks routing. Absolute
  paths from plugin-react fix it for every host.
- A contribution to `vite.slots.pluginCalls` reaches the app's own config, so host-only calls need
  their own list.

## Routes and stories

- Listing routes in Node: `new Generator({ config, root }).run()` from `@tanstack/router-generator`
  (with `getConfig({ routesDirectory, generatedRouteTree, target: "react" }, root)`) writes the route
  tree, whose `interface FileRoutesByFullPath` names every route. `physicalGetRouteNodes` throws
  (`Cannot destructure property 'routeTokenSegmentRegex' of 'tokenRegexes'`) without internal
  arguments. In the browser, `createRouter({ routeTree }).routesByPath` lists them.
- A story renders `createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }) })`
  through `<RouterProvider>` inside the preview's `virtual:stack-providers`, with `.stack/app.css`.
  A `$param` takes the example value the fixtures file gives it; a param without one throws.
- A parent route without `<Outlet/>` renders itself for its children's URLs (`projects.tsx` over
  `projects.$id.tsx` drew the list for `/projects/p1`); the spike renamed it `projects.index.tsx`.
- Storybook did not index generated story files under a dot-directory, with `stories` as a static
  glob or a function; under a non-dot folder a new route's stories reached `index.json` in about
  8 s without a restart. The cause is inferred from that move, not read from Storybook's source.

## Isolation

Ten story files, one per route × state, each its own Vitest browser page: all started within
0.4 s, each held its page 2.5 s and re-asserted its state, so a handler leaking across pages would
have flipped an answer; none did (`Test Files 10 passed`, 14.75 s, three runs). The pages are one
origin sharing one service worker; MSW routes handlers by client, which is why this holds.
Verified in Chromium only.

## Not covered

Mutations (a mutation hits the same fixture lookup); light/dark and density in screen stories;
`root` moved to the app with the derived config; `pnpm check` over the spike; the showcase's
`/layout` migration.
