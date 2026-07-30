---
id: 001-05
status: backlog
depends: [001-03, 001-04]
---
# The canon sweep, both plugins

## Goal

One pass across all 60 components in both plugins: `class`, `className`, and `style` declared
`?: never` on every own-props type with nothing in their place, the `ReactNode` props the canon
turns into descriptors collapsed, and the rhythm family added.

Driver: `docs/prd/ui-core.md` M5. Refine before running.

## Refinement notes

- Both plugins in one story on purpose. The canon's whole claim is that the same fact carries the
  same name on both platforms, and two separate stories would drift.
- `?: never` rather than deletion: on the 16 web components using Kobalte's `Polymorphic`, dropping
  `class` from the own-props type re-admits it, since `PolymorphicProps<T, P>` resolves to
  `P & Omit<ComponentProps<T>, keyof P>`.
- No hatch replaces the closed props. Where a component relied on a forwarded class to lay itself
  out, the geometry moves into the component or into the rhythm family.
- `Stack`, `Row`, `Pair` are new on both. `Section.Root` gains the rung and axis on web; `Section` is
  the rung alone on native.
