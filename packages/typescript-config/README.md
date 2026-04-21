# @fcalell/typescript-config

Shared TypeScript configuration presets for the `@fcalell/stack` framework.

## Install

```bash
pnpm add -D @fcalell/typescript-config
```

## Presets

### `base.json`

Foundation config. All other presets extend this.

- `strict: true`, `isolatedModules: true`, `skipLibCheck: true`
- `target: ES2022`, `module: node18`, `moduleResolution: node16`
- `noUncheckedIndexedAccess: true`

### `solid-vite.json`

For SolidJS apps built with Vite.

- Extends `base.json`
- `jsx: preserve`, `jsxImportSource: solid-js`
- `module: ESNext`, `moduleResolution: Bundler`
- `lib: ESNext, DOM, DOM.Iterable`
- `noEmit: true`

### `node-tsx.json`

For Node.js packages run via `tsx`.

- Extends `base.json`
- `module: esnext`, `moduleResolution: bundler` (packages publish `.ts` source directly via `exports` and run under `tsx`, which resolves without explicit `.js` extensions)

## Usage

```json
{
  "extends": "@fcalell/typescript-config/solid-vite.json",
  "include": ["src"]
}
```

```json
{
  "extends": "@fcalell/typescript-config/node-tsx.json",
  "include": ["src"]
}
```

## License

MIT
