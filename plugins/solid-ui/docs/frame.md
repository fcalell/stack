# Frame

The viewport-capped app frame: `flex h-dvh min-h-0 flex-col overflow-hidden`. The page never scrolls; panes inside it do. `dvh` tracks the visible viewport as mobile browser chrome expands and collapses, so pinned bottom chrome stays reachable. Frame carries no ground classes; the body owns the ground.

Frame is the app frame inside the page, not the HTML document shell: `plugin-solid`'s `shell` slot and template own the `<html>`/`<head>`/`<body>` document around it.

```tsx
import { Frame } from "@fcalell/plugin-solid-ui/components/frame";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `JSX.Element` | The frame's regions |

## Composition contract

Children are intrinsic-height chrome (a header row, a banner, a footbar) plus exactly one flexing region, typically a `ScrollArea` or a `Section` wrapping one. Portalled overlays (dialogs, sheets, toasts) contribute no height.

```tsx
<Frame>
  <header>…</header>
  <Section>
    <ScrollArea>{body}</ScrollArea>
  </Section>
</Frame>
```

`SidebarProvider` (`min-h-svh`) is an alternative page root for the page-scroll world and does not nest inside Frame.
