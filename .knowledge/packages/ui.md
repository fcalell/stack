# @fcalell/ui

Design system for SolidJS applications. Brutalist dark-mode aesthetic.

**Stack:** Kobalte (headless primitives) + Tailwind v4 + CVA (variants) + tailwind-merge

## Usage

```tsx
import { Button } from "@fcalell/ui/components/button"
import { cn } from "@fcalell/ui/lib/utils"
import "@fcalell/ui/globals.css"
import "@fcalell/ui/fonts"
```

## Components

<!-- Component catalog will be populated during migration from @repo/ui -->

## Conventions

- Each component lives in `src/components/<name>/index.ts`
- Variants use CVA (`class-variance-authority`)
- Use `cn()` from `lib/utils` to merge classes (clsx + tailwind-merge)
- Icons from `lucide-solid`
- Toast notifications via `solid-sonner`
- Tables via `@tanstack/solid-table`
