# ScrollArea

The one scroll owner for a pane. Geometry lives in the component; sizing comes from the flex parent, never from a prop. A capped pane (a `max-h` code block, a bounded log) carries product look and belongs in a consumer `ui/` primitive.

```tsx
import { ScrollArea } from "@fcalell/plugin-solid-ui/components/scroll-area";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `JSX.Element` | | The scrolled content |
| `axis` | `"y" \| "x" \| "both"` | `"y"` | Which axis scrolls |
| `pinToBottom` | `boolean` | `false` | Follow appended content until the reader scrolls up |

## One engine per box

ScrollArea owns the scroll engine for its box. Ownership is per box, not per page: distinct boxes may each scroll the same axis (a kanban page pane holding column panes), and that is composition. One box with two engines is the mistake: wrapping a pane directly in another pane of the same axis, with nothing bounding the inner one, is one pane too many.

## Composing on the y axis

`axis="y"` (and `"both"`) is the fill pane of a flex box: `flex-1 min-h-0 min-w-0` plus the overflow class. Two rules follow:

- **The parent gives the pane its box.** The pane takes the height its flex parent gives it, a `Frame` or a `Section`. A content-height parent gives the pane no box and therefore no scrolling.
- **Every intermediate flex ancestor must be shrinkable.** A flex child defaults to `min-height: auto`, so an ancestor between the height source and the pane needs `min-h-0` or it grows to its content and the pane never scrolls. `Section` carries it already.

Sheet and Dialog content are their own scroll owners (`max-h-screen overflow-y-auto`, block not flex), so a fill pane does not compose inside them. A non-scrolling drawer layout stays consumer territory.

```tsx
<Frame>
  <Section>
    <Section.Header>
      <Section.Title>Activity</Section.Title>
    </Section.Header>
    <ScrollArea pinToBottom>
      <Stack>{entries}</Stack>
    </ScrollArea>
  </Section>
</Frame>
```

## Composing on the x axis

`axis="x"` is an intrinsic-height strip: `w-full min-w-0 overflow-x-auto`, no `flex-1` and no fill height, so a strip inside a column never becomes a second flexing region. A multi-item strip needs an inner flex row whose items carry `shrink-0`; items left shrinkable squish to min-content and the strip silently never scrolls.

```tsx
<ScrollArea axis="x">
  <div class="flex gap-row">
    <div class="shrink-0">…</div>
    <div class="shrink-0">…</div>
  </div>
</ScrollArea>
```

## pinToBottom

The pane starts at its end, follows appended content while the reader sits within 40px of the bottom, and stays put once they scroll up. Growth with no observed DOM mutation (late-loading media, async layout) does not re-pin. The prop pins the y axis and is meaningless under `axis="x"`. It is read once at mount:
toggling it later neither starts nor stops the engine.
