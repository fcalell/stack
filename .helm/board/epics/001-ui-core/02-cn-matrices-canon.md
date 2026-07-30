---
id: 001-02
status: backlog
depends: [001-01]
---
# Shared cn, the first variant matrices, the API canon

## Goal

`@fcalell/ui-core` gains `cn()` with the extended `tailwind-merge` config, the invariant CVA
matrices for button, text, pill, card, and field, the shared descriptor types, and the API canon
written as law in the README. Nothing is enforced yet, so the canon lands before the sweeps that
apply it.

Driver: `docs/prd/ui-core.md` M2. Refine before running.

## Refinement notes

- The matrices hold platform-invariant cells only (fills, borders, ink, padding rungs, radius, type
  role). Interaction and state classes are platform overlays, per the PRD's sharing-line decision.
- Every legal cell is spelled in `compoundVariants` so the matrix cannot drift.
- React Native does not inherit text color, so a matrix that tints content carries a per-slot label
  table, and web consumes the same table rather than diverging.
- `Action`'s `icon` is a type parameter, since it is a `lucide-solid` component on web and a
  `lucide-react-native` one on native, and ui-core depends on neither.
- The canon law list is in the PRD's M2 section. It ends with: a primitive takes no `class`,
  `className`, or `style` prop.
- Anchor against the existing `cn` implementations in both plugins and against 001-01's token names
  before writing the merge config: the type-role classes need registering as the font-size group and
  `rounded-control` in the radius group.
