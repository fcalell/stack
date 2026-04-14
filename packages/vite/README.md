# @fcalell/vite

Vite preset for the `@fcalell/stack` framework. Pre-configures SolidJS, Tailwind v4, and an API proxy — consumers get a working build with zero config.

**Stack:** Vite + vite-plugin-solid + @tailwindcss/vite (all internal — consumers don't import them)

## Install

```bash
pnpm add @fcalell/vite
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "@fcalell/vite";

export default defineConfig();
```

That's it. SolidJS compilation, Tailwind v4 processing, and an API proxy to `localhost:8787` are all configured automatically.

## Options

`defineConfig` accepts all standard Vite config options, plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiProxy` | `string \| false` | `"http://localhost:8787"` | Proxy target for `/rpc` requests. Set to `false` to disable. |
| `plugins` | `Plugin[]` | `[]` | Additional Vite plugins (appended after SolidJS + Tailwind). |

```ts
// Custom proxy target
export default defineConfig({
  apiProxy: "http://localhost:9000",
});

// No API (app-only project)
export default defineConfig({
  apiProxy: false,
});

// Additional plugins + standard Vite options
export default defineConfig({
  plugins: [myPlugin()],
  server: { port: 4000 },
});
```

## What it handles

- **SolidJS** — JSX compilation via `vite-plugin-solid`
- **Tailwind v4** — CSS processing via `@tailwindcss/vite`
- **API proxy** — `/rpc` requests proxied to the Cloudflare Worker dev server in development

Consumers never install `vite`, `vite-plugin-solid`, `@tailwindcss/vite`, or `tailwindcss` directly.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/vite` | `defineConfig()` |

## License

MIT
