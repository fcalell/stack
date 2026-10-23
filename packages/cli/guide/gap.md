# A gap in stack

A gap is one of two things, and nothing else:

- **a bug**: stack renders or behaves wrong for what it already offers;
- **a missing feature that matters**: an act, an option or a contract the app cannot ship
  without (a component, an option in a plugin, a feature of a procedure, a column type), which no
  composition of what stack provides delivers.

Anything short of that is not a gap: the app takes the nearest shape stack provides (another
component, a plainer layout, a nicety dropped) and names the compromise as a known limit. Polish
(a measurement off its pattern's range, a variant that would read better, a state stack draws
plainly) is never a gap.

Gap or not, nothing is rebuilt in the app: no host element with tokens, no local copy of a stack
module, no wrapper that re-adds what stack lacks. The app never writes into the stack checkout.

Before reporting a gap, check whether stack's latest already has the part: the pin is the commit
`pnpm-lock.yaml` records for the `@fcalell/*` packages, and stack's `HEAD` may be ahead of it.
When it is, the fix is moving the pin (`pnpm update "@fcalell/*"`), proposed to fcalell. When it
is not, tell fcalell what is missing, the app work that needs it, and why nothing stack ships
provides it. Only the work that cannot ship without the part waits for it.
