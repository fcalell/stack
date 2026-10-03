# Config

`stack.config.ts` is the app's one config: its identity and the plugins that make it up. Every
generated file derives from it, so after an edit run `stack generate` (`stack dev` and
`stack build` run it first).

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { react } from "@fcalell/plugin-react";
import { reactUi } from "@fcalell/plugin-react-ui";
import { vite } from "@fcalell/plugin-vite";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    cloudflare(),
    db({ dialect: "d1", databaseId: "…" }),
    auth({ organization: true }),
    api(),
    vite(),
    react({ title: "My App" }),
    reactUi({ theme: { accentHue: 120 } }),
  ],
});
```

## `app`

`app` holds only what more than one plugin reads:

- `name` (required): the worker's name, the default auth cookie prefix, the fallback `<title>`.
- `domain` (required): the production origins, `https://<domain>` and `https://app.<domain>`, and
  the URLs auth builds.
- `origins` (optional): replaces the derived CORS allow-list. A local origin in it (`localhost`,
  `127.0.0.1`, `*.localhost`) counts only in dev, unless the deploy target itself is local.

Anything one plugin alone reads is that plugin's option, never a field of `app`: the page title
is `react({ title })`, the API prefix `api({ prefix })`, the deep-link scheme `expo({ scheme })`.

## `plugins`

List every plugin the app uses; nothing is added implicitly, and order does not matter. A plugin
that needs another names it, and a missing one fails with the plugin to add:

| Plugin | Needs |
| --- | --- |
| `react()` | `vite()` |
| `reactUi()` | `react()`, `vite()` |
| `nativeUi()` | `expo()`, `api()`, `auth()` |
| `auth()` | `api()`, `db()` |
| `db()`, `node()` | `api()` |

Each plugin's options are typed and defaulted; its guide pages list them. Add a
plugin with `stack add <plugin>` rather than by hand: it also writes the plugin's starter files
and dependencies.

## Rules

- Keep `stack.config.ts` erasable TypeScript: `stack` loads it with a plain `import()` under
  Node's type stripping, so no enums, no parameter properties, and every relative import names
  its file's extension (`./theme.ts`).
- Never edit a generated file under `.stack/` to change behaviour: change the config and
  regenerate.

**Check:** `stack generate` exits cleanly, then `pnpm check` passes.
