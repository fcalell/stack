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

Before reporting a gap, check whether stack's latest release already has the part: the app's
version is the one `pnpm-lock.yaml` records for the `@fcalell/*` packages, and npm may hold a newer
one (`pnpm outdated "@fcalell/*"`). When it does, the fix is moving the version
(`pnpm update "@fcalell/*"`, which moves every stack package together), proposed to the owner of
the app. When it does not, open an issue on the stack repository saying what is missing, the app
work that needs it, and why nothing stack ships provides it. Only the work that cannot ship
without the part waits for it.
