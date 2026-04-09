# UI Component Migration

## Context

We are migrating components from `../martechthings/packages/ui/` (the `@repo/ui` package) into `packages/ui/` (the `@fcalell/ui` package) in this monorepo.

Read the following files before starting:
- `CLAUDE.md` and `.claude/rules/conventions.md` — project conventions
- `packages/ui/README.md` — design system overview, token system, component conventions
- `packages/ui/docs/*.md` — existing component docs (to understand the established documentation style)
- `packages/ui/src/globals.css` — token system and available semantic colors/radius/shadows
- `packages/ui/src/components/text/index.tsx` — reference for how compound components are structured
- `packages/ui/src/components/button/index.tsx` — reference for how single (non-compound) components are structured

Then read the original source component(s) being migrated from `../martechthings/packages/ui/src/components/`.

## Design principles

1. **Minimal consumer API, maximum derivation.** The design system derives tokens from a small set of base CSS variables. Components should use semantic tokens (`bg-primary`, `text-muted-foreground`, `rounded-md`, `shadow-sm`, etc.) — never raw Tailwind palette colors.

2. **Strict design system.** Components handle their own typography, spacing, and visual treatment internally. Consumers pick a component and it looks correct. Use `Text` sub-components for all rendered text inside other components (e.g. a card title should use `Text.H4` or similar, a description should use `Text.Muted`).

3. **Compound components (dot notation)** for components with internal structure (e.g. `Card.Header`, `Card.Title`, `Card.Content`). Single export for atomic components (e.g. `Button`, `Badge`). Use your judgement based on whether the component has meaningful sub-parts.

4. **Polymorphic where it makes sense** via Kobalte's `as` prop and `PolymorphicProps`. Every sub-component accepts `class` for Tailwind overrides via `cn()`.

5. **No built-in margins** on any component. Parent components handle layout spacing via `gap` or padding.

6. **Kobalte primitives for accessibility** — use `@kobalte/core/*` for interactive components (dialogs, menus, tooltips, tabs, etc.) to get keyboard handling, ARIA attributes, and focus management for free.

7. **CVA for variants** — use `class-variance-authority` when a component has variant/size props. Export the variants alongside the component for composition by other components.

## Workflow for each component

1. **Study the original** — read the source in `../martechthings/packages/ui/src/components/<name>/`. Understand every prop, variant, sub-component, and how it's used by other components.

2. **Reason about the API** — present the proposed public API before implementing. Consider:
   - Should it be compound (dot notation) or single export?
   - What props does the consumer control vs what the component handles internally?
   - What Kobalte primitive does it wrap (if any)?
   - What changes from the original (added `rounded-*`, uses semantic tokens, uses `Text` internally, etc.)?

3. **Implement** — create `src/components/<name>/index.tsx`. Follow the patterns established in the existing components. Use `#lib/cn` for internal imports.

4. **Document** — create `docs/<name>.md` following the established style:
   - One-line description of what the component is and when to use it
   - Import statement
   - Props table (with types, defaults, descriptions)
   - Each sub-component or variant documented with: what it's for, when to use it, what it renders, and a code example
   - Composition examples if relevant

5. **Update README** — add a row to the component table in `packages/ui/README.md`.

6. **Validate** — run `pnpm --filter @fcalell/ui check` (type-check + lint).

7. **Remove from queue** — delete the component you just migrated from the queue below, then proceed to the next one. Repeat until the queue is empty.

## Migration queue

Migrate the **first component** in this list. After completing it (implement + document + validate), remove it from this list and proceed to the next one.

- separator
- badge
- label
- input
- textarea
- checkbox
- select
- field
- input-group
- input-otp
- enum-input
- card
- avatar
- empty-state
- inset
- item
- section
- section-toolbar
- table
- data-table
- dialog
- sheet
- dropdown-menu
- context-menu
- tooltip
- tabs
- toast
- loader
- danger-zone
- navigation-progress
- sidebar
- logo
