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

Type-checking for Node.js packages and consumers.

- Extends `base.json`
- `module: esnext`, `moduleResolution: bundler`, `noEmit: true`, `allowImportingTsExtensions: true`

### `build.json`

The emit overlay a package's `tsconfig.build.json` layers on its own `tsconfig.json`. Extends
nothing, so the package keeps its `lib` and `jsx`.

- `rootDir: src`, `outDir: dist`, `include: src`; `src/ui` and `.tsx` stay out (bundlers compile them from source)
- `module: nodenext`, `moduleResolution: nodenext`: an extensionless relative import fails the build
- `rewriteRelativeImportExtensions: true`: sources import with `.ts`, output imports `.js`
- `declaration`, `declarationMap`, `sourceMap`, `verbatimModuleSyntax`, `isolatedModules`

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

```json
// tsconfig.build.json
{
  "extends": ["./tsconfig.json", "@fcalell/typescript-config/build.json"]
}
```

## License

MIT
