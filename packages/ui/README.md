# @fcalell/ui

Design system for SolidJS. Ships themed components, a derivable token system, and Tailwind v4 integration — configure a few base values and get a complete, consistent UI out of the box.

**Stack:** SolidJS + Kobalte (accessibility) + Tailwind v4 + CVA (variants)

## Install

```bash
pnpm add @fcalell/ui
```

Peer dependency: `solid-js ^1.9`.

Optional peer dependencies (install only if you use the corresponding features):
- `@tanstack/solid-form ^1.28` — required by `Form` adapters
- `@tanstack/solid-query ^5.80` — required by `lib/query` utilities

## Quick start

### 1. Import the stylesheet

```css
/* app.css */
@import "tailwindcss";
@import "@fcalell/ui/globals.css";
```

This gives you semantic Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-md`, `shadow-sm`, etc.), light/dark mode tokens, and base styles — all with sensible defaults.

### 2. Optional: load fonts

```ts
import "@fcalell/ui/fonts";
```

Registers JetBrains Mono Variable. Then override the font token:

```css
:root {
  --ui-font-sans: "JetBrains Mono Variable", monospace;
  --ui-font-mono: "JetBrains Mono Variable", monospace;
}
```

### 3. Use components

```tsx
import { Text } from "@fcalell/ui/components/text";

<Text.H1>Dashboard</Text.H1>
<Text.P>Welcome back. Here's what's happening today.</Text.P>
<Text.Muted>Last updated 5 minutes ago</Text.Muted>
```

### 4. Enable dark mode

Add the `dark` class to `<html>` — all tokens switch automatically:

```html
<html class="dark">
```

When the `@fcalell/vite` preset is used, an anti-FOUC script is injected into `index.html` automatically — it reads `localStorage.theme` (falling back to `prefers-color-scheme`) and sets `.dark` on `<html>` before first paint, so consumers don't have to write the inline script themselves.

## App entry

Wire the entire app with one call:

```tsx
// src/app/entry.tsx
import { createApp } from "@fcalell/ui/app";
import "./app.css";

createApp();
```

`createApp()` mounts the app and wraps the tree in `ErrorBoundary → providers → QueryClientProvider → MetaProvider → Router → Toaster`. Routes are pulled from the `virtual:fcalell-routes` module emitted by `@fcalell/vite` (file-based routing under `src/app/pages/`) — pass an explicit `routes` array to opt out.

```tsx
createApp({
  routes,                                            // optional — defaults to virtual:fcalell-routes
  providers: (children) => <FeatureFlags>{children}</FeatureFlags>,
  queryClient,                                       // optional — defaults to new QueryClient()
  errorFallback: (err, reset) => <MyFallback ... />, // optional — defaults to <EmptyState>
  rootId: "root",                                    // optional — element id to mount into
});
```

### Routing

`@fcalell/ui/router` re-exports the SolidJS Router primitives (`A`, `Navigate`, `useNavigate`, `useParams`, `useLocation`, `useSearchParams`, `useMatch`, `useResolvedPath`, `useIsRouting`, `useCurrentMatches`) plus a typed `routes` builder generated from your `src/app/pages/` tree:

```tsx
import { A, useNavigate, routes } from "@fcalell/ui/router";

<A href={routes.projects.detail({ id: "123" })}>Open project</A>;

const navigate = useNavigate();
navigate(routes.projects.settings({ id: "123" }));
```

Missing or extra params are compile errors. Renaming a page file renames the builder property, surfacing every stale call site.

### Meta tags

`@fcalell/ui/meta` re-exports `Title`, `Meta`, `Link`, and `MetaProvider` from `@solidjs/meta`. `createApp()` wraps the tree in `<MetaProvider>` automatically — use `<Title>` inline in any page:

```tsx
import { Title } from "@fcalell/ui/meta";

export default function ProjectDetail() {
  return (
    <>
      <Title>Project · MyApp</Title>
      {/* ... */}
    </>
  );
}
```

### useTheme

Runtime light/dark toggle. Reads/writes `localStorage.theme` and toggles `.dark` on `<html>`:

```tsx
import { useTheme } from "@fcalell/ui/lib/theme";

const [theme, setTheme] = useTheme();
<button onClick={() => setTheme(theme() === "dark" ? "light" : "dark")}>
  Toggle theme
</button>;
```

## Token system

The design system derives all visual tokens from a minimal set of base values. Override any of these in your app's CSS to customize everything at once:

```css
:root {
  --ui-primary-h: 250;      /* Brand hue (0-360, OKLCh) */
  --ui-primary-c: 0.17;     /* Brand chroma (0-0.4) */
  --ui-gray-h: 250;         /* Gray tint hue */
  --ui-gray-c: 0.015;       /* Gray tint chroma */
  --ui-radius: 0.5rem;      /* Base border radius */
  --ui-shadow-strength: 1;  /* Shadow intensity (0=none, 1=full) */
  --ui-spacing: 0.25rem;    /* Tailwind spacing multiplier */
  --ui-font-sans: ui-sans-serif, system-ui, sans-serif;
  --ui-font-mono: ui-monospace, monospace;
}
```

### What gets derived

From these base values, the system generates:

**Colors** — 17 semantic color pairs (background/foreground, card, primary, secondary, muted, accent, destructive, success, warning, border, input, ring) for both light and dark mode, using OKLCh for perceptual uniformity.

**Radius** — 7-step scale via multipliers on `--ui-radius`:

| Token | Multiplier | Default |
|-------|-----------|---------|
| `rounded-xs` | 0.5x | 0.25rem |
| `rounded-sm` | 0.75x | 0.375rem |
| `rounded-md` | 1x | 0.5rem |
| `rounded-lg` | 1.5x | 0.75rem |
| `rounded-xl` | 2x | 1rem |
| `rounded-2xl` | 3x | 1.5rem |
| `rounded-full` | — | 9999px |

**Shadows** — 5-step scale with opacity proportional to `--ui-shadow-strength`. Dark mode automatically uses higher opacity values. Set `--ui-shadow-strength: 0` for a flat/brutalist look.

**Spacing** — Tailwind's spacing multiplier (`p-4` = 4 x `--ui-spacing`).

### Status colors

Status hues have sensible defaults but can be overridden:

```css
:root {
  --ui-success-h: 152;  /* Green */
  --ui-warning-h: 80;   /* Yellow */
  --ui-error-h: 28;     /* Red */
}
```

### Theming examples

Warm brand with no shadows (flat/brutalist):

```css
:root {
  --ui-primary-h: 30;
  --ui-primary-c: 0.2;
  --ui-gray-h: 30;
  --ui-shadow-strength: 0;
  --ui-radius: 0;
}
```

Monospace developer tool:

```css
:root {
  --ui-primary-h: 260;
  --ui-primary-c: 0.22;
  --ui-font-sans: "JetBrains Mono Variable", monospace;
  --ui-radius: 0;
  --ui-shadow-strength: 0;
}
```

## Semantic color palette

All components use semantic color names. These adapt automatically to light/dark mode:

| Tailwind utility | Purpose |
|-----------------|---------|
| `bg-background` / `text-foreground` | Page-level surface |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-popover` / `text-popover-foreground` | Dropdowns, tooltips |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-secondary` / `text-secondary-foreground` | Secondary actions |
| `bg-muted` / `text-muted-foreground` | De-emphasized content |
| `bg-accent` / `text-accent-foreground` | Hover/active highlights |
| `bg-destructive` / `text-destructive-foreground` | Destructive actions |
| `bg-success` / `text-success-foreground` | Success states |
| `bg-warning` / `text-warning-foreground` | Warning states |
| `border-border` | Default border color |
| `border-input` | Input border color |
| `ring-ring` | Focus ring color |

## Components

All components use compound dot-notation, are polymorphic (via Kobalte's `as` prop), and accept `class` for Tailwind overrides. Every sub-component passes through all HTML attributes to the rendered element.

Per-component documentation lives in `docs/`:

| Component | Import | API | Docs |
|-----------|--------|-----|------|
| Text | `@fcalell/ui/components/text` | Compound: H1, H2, H3, H4, P, Lead, Large, Small, Muted, Code | [docs/text.md](docs/text.md) |
| Button | `@fcalell/ui/components/button` | Single + `buttonVariants`. Props: `variant`, `size` | [docs/button.md](docs/button.md) |
| Separator | `@fcalell/ui/components/separator` | Single. Props: `orientation` | [docs/separator.md](docs/separator.md) |
| Badge | `@fcalell/ui/components/badge` | Single + `badgeVariants`. Props: `variant`, `round` | [docs/badge.md](docs/badge.md) |
| Label | `@fcalell/ui/components/label` | Single. Uppercase muted label for form fields | [docs/label.md](docs/label.md) |
| Input | `@fcalell/ui/components/input` | Single + `inputClasses`. Props: `size` | [docs/input.md](docs/input.md) |
| Textarea | `@fcalell/ui/components/textarea` | Single + `textareaClasses`. Props: `size` | [docs/textarea.md](docs/textarea.md) |
| Checkbox | `@fcalell/ui/components/checkbox` | Single + `checkboxVariants`. Props: `size`, `label`, `indeterminate` | [docs/checkbox.md](docs/checkbox.md) |
| Select | `@fcalell/ui/components/select` | Data-driven. Props: `options`, `value`, `onValueChange`, `size`, `children` (render prop) | [docs/select.md](docs/select.md) |
| Field | `@fcalell/ui/components/field` | Compound: Label, Content, Description, Value, Error | [docs/field.md](docs/field.md) |
| InputGroup | `@fcalell/ui/components/input-group` | Compound: Input, Textarea, Addon, Button, Text | [docs/input-group.md](docs/input-group.md) |
| InputOTP | `@fcalell/ui/components/input-otp` | Compound: Input, Group, Slot, Separator + `REGEXP_ONLY_DIGITS` | [docs/input-otp.md](docs/input-otp.md) |
| EnumInput | `@fcalell/ui/components/enum-input` | Single. Props: `values`, `onChange` | [docs/enum-input.md](docs/enum-input.md) |
| Card | `@fcalell/ui/components/card` | Compound: Header, Title, Description, Content, Footer | [docs/card.md](docs/card.md) |
| Avatar | `@fcalell/ui/components/avatar` | Compound: Image, Fallback + `avatarVariants`. Props: `size` | [docs/avatar.md](docs/avatar.md) |
| EmptyState | `@fcalell/ui/components/empty-state` | Single. Props: `icon`, `title`, `description` | [docs/empty-state.md](docs/empty-state.md) |
| Inset | `@fcalell/ui/components/inset` | Single. Props: `variant` | [docs/inset.md](docs/inset.md) |
| Item | `@fcalell/ui/components/item` | Compound: Group, Separator, Media, Content, Title, Description, Actions, Header, Footer | [docs/item.md](docs/item.md) |
| Section | `@fcalell/ui/components/section` | Compound: Header, Title, Content, Table | [docs/section.md](docs/section.md) |
| SectionToolbar | `@fcalell/ui/components/section-toolbar` | Compound: Left, Right | [docs/section-toolbar.md](docs/section-toolbar.md) |
| Table | `@fcalell/ui/components/table` | Compound: Header, Body, Footer, Row, Head, Cell, Caption | [docs/table.md](docs/table.md) |
| DataTable | `@fcalell/ui/components/data-table` | Single. Props: `columns`, `data`, `fallback`, `caption` | [docs/data-table.md](docs/data-table.md) |
| Dialog | `@fcalell/ui/components/dialog` | Compound: Trigger, Content, Header, Footer, Title, Description, Provider + `createDialog`, `createConfirmDialog`, `createConfirmByNameDialog` | [docs/dialog.md](docs/dialog.md) |
| Sheet | `@fcalell/ui/components/sheet` | Compound: Trigger, Close, Content, Header, Footer, Title, Description | [docs/sheet.md](docs/sheet.md) |
| DropdownMenu | `@fcalell/ui/components/dropdown-menu` | Compound: Trigger, Content, Item, Shortcut, Label, Separator, Sub, SubTrigger, SubContent, CheckboxItem, GroupLabel, RadioGroup, RadioItem | [docs/dropdown-menu.md](docs/dropdown-menu.md) |
| ContextMenu | `@fcalell/ui/components/context-menu` | Compound: Trigger, Content, Item, Shortcut, Separator, Sub, SubTrigger, SubContent, CheckboxItem, GroupLabel, RadioGroup, RadioItem | [docs/context-menu.md](docs/context-menu.md) |
| Tooltip | `@fcalell/ui/components/tooltip` | Compound: Trigger, Content | [docs/tooltip.md](docs/tooltip.md) |
| Tabs | `@fcalell/ui/components/tabs` | Compound: List, Trigger, Content, Indicator | [docs/tabs.md](docs/tabs.md) |
| Toast | `@fcalell/ui/components/toast` | `Toaster` + `toast()` imperative API | [docs/toast.md](docs/toast.md) |
| Loader | `@fcalell/ui/components/loader` | Single. Props: `text` | [docs/loader.md](docs/loader.md) |
| DangerZone | `@fcalell/ui/components/danger-zone` | Single. Props: `description`, `actionLabel`, `onAction` | [docs/danger-zone.md](docs/danger-zone.md) |
| NavigationProgress | `@fcalell/ui/components/navigation-progress` | Single. Props: `loading` | [docs/navigation-progress.md](docs/navigation-progress.md) |
| Sidebar | `@fcalell/ui/components/sidebar` | Compound: Provider, Trigger, Rail, Inset, Header, Footer, Content, Group, Menu, MenuItem, MenuButton, + more | [docs/sidebar.md](docs/sidebar.md) |
| Logo | `@fcalell/ui/components/logo` | Single. Props: `icon`, `text`, `size`, `responsive` | [docs/logo.md](docs/logo.md) |
| Form | `@fcalell/ui/components/form` | Namespace: Field, Input, Textarea, Select, Checkbox, InputOTP, EnumInput. TanStack Form adapters + `useApiForm` helper + raw `createForm` | [docs/form.md](docs/form.md) |
| QueryBoundary | `@fcalell/ui/components/query-boundary` | Single. Props: `query`, `loadingFallback`, `emptyWhen`, `emptyFallback`, `gracePeriod` | [docs/query-boundary.md](docs/query-boundary.md) |

## Utilities

### cn

Class merging utility (clsx + tailwind-merge):

```ts
import { cn } from "@fcalell/ui/lib/cn";

cn("px-4 py-2", condition && "bg-primary", className);
```

### query

Safe TanStack Solid Query wrappers, a multi-query combiner, and a single mutation hook with optional optimistic updates. Prevents SolidJS Suspense corruption when reading `.data` on pending queries.

```ts
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  combineQueries,
} from "@fcalell/ui/lib/query";
```

`useMutation` accepts a single config with optional `updates` for optimistic cache mutations and automatic rollback on error:

```tsx
// Simple — no optimistic ceremony
const deleteProject = useMutation(() => ({
  mutation: () => api.projects.delete.mutationOptions(),
  errorMessage: "Failed to delete project",
}));

// Optimistic — same API, just adds updates
const createProject = useMutation(() => ({
  mutation: () => api.projects.create.mutationOptions(),
  updates: [
    { queryKey: () => ["projects"], updater: (old, vars) => [...old, vars] },
  ],
  onSuccess: (data) => navigate(`/projects/${data.id}`),
}));
```

Requires peer dependency: `@tanstack/solid-query ^5.80`.

### useApiForm

Wraps TanStack Solid Form with Zod validation, a mutation, toasts, and field-error mapping for `ApiError.fieldErrors`. Five lines instead of ~25:

```tsx
import { useApiForm } from "@fcalell/ui/components/form";

const form = useApiForm({
  schema: createProjectSchema,
  defaultValues: { name: "" },
  mutation: api.projects.create,
  onSuccess: (project) => navigate(`/projects/${project.id}`),
  successMessage: "Project created",
  errorMessage: "Failed to create project",
});
```

Returns the raw TanStack form instance — `Form.Input` / `Form.Select` / etc. work unchanged. The `createForm` raw export remains available for unusual cases (multi-step forms, uploads, conditional mutations).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/ui/globals.css` | Token system, Tailwind theme, base styles, animations |
| `@fcalell/ui/fonts` | JetBrains Mono Variable font registration (side-effect import) |
| `@fcalell/ui/fonts-manifest` | `FontEntry` type and `defaultFonts` array — consumed by the `@fcalell/vite` preload plugin |
| `@fcalell/ui/app` | `createApp()` — mounts the root tree with router, query, meta, toaster, error boundary |
| `@fcalell/ui/router` | Typed `routes` builder (from `virtual:fcalell-routes`) + SolidJS Router primitives (`A`, `useNavigate`, `useParams`, ...) |
| `@fcalell/ui/meta` | `Title`, `Meta`, `Link`, `MetaProvider` — re-exported from `@solidjs/meta` |
| `@fcalell/ui/components/*` | Component modules (e.g., `components/text`); `components/form` also exports `useApiForm` and the raw `createForm` |
| `@fcalell/ui/lib/cn` | `cn()` class merging utility |
| `@fcalell/ui/lib/query` | Safe `useQuery`/`useInfiniteQuery`, `useMutation` (with optional optimistic updates), `useQueryClient`, `combineQueries` |
| `@fcalell/ui/lib/theme` | `useTheme()` runtime light/dark toggle |

## Conventions

- Components use compound dot-notation (`Text.H1`, not standalone `H1`)
- Components handle their own typography, spacing, and visual treatment internally
- Other components use Text sub-components for all rendered text
- No built-in margins on any component — use `gap` or parent padding for layout
- All components accept `class` for Tailwind overrides via `cn()`
- All components are polymorphic where it makes sense (`as` prop via Kobalte)
- Semantic color tokens only — no raw Tailwind palette colors (no `bg-blue-500`)
- Dark mode via `.dark` class on `<html>` — tokens switch automatically
- Consumers never install `tailwind-merge`, `clsx`, `@kobalte/core`, or `cva` directly

## License

MIT
