# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase: every roster component in every cell,
state, mode and density, one page per `?mode=<light|dark>&density=<touch|desktop>`.

```bash
pnpm --filter showcase dev     # stack dev
pnpm --filter showcase gates   # the Playwright gates, Chromium only
```

## Gates

`pnpm --filter showcase gates` builds the showcase (`stack build`), serves the build with
`vite preview` on port 4173, and runs `gates/*.test.ts`, one file per Done gate:

| File | Gate |
| --- | --- |
| `inventory` | each page draws every `showcaseCells()` id of its density exactly once, and no other |
| `contrast` | on the composited render, text ≥ 4.5:1, large text ≥ 3:1, icons, fields and unlabelled controls ≥ 3:1, in every frame's mode and state |
| `target-size` | every target ≥ 24×24 px, a primary act ≥ 44×44 under touch density, 8 px between targets |
| `overflow` | no horizontal overflow at 320, 390, 768, 1280 and 1440; no text cut under WCAG 1.4.12 text spacing |
| `accessibility` | axe zero serious or critical per page; Tab reaches every target in order with a focus indicator ≥ 3:1 against rest, not covered by a sticky or fixed element; `Sheet`, `Menu` and `Picker` take focus, keep a dialog's Tab inside, and return focus on Escape |
| `states` | every non-rest state draws differently from rest, with and without reduced motion |
| `console` | no console error or warning and no failed request on any page |
| `motion` | no transition of `all`, every duration a contract rung, every duration 0 under reduced motion |

A gate that measures a drawn component runs one test per roster component and skips a component
the showcase `registry` does not draw as `not registered`; the run ends with the count of those
gaps per gate. Frames render with the pointer off the page and transitions off, except under
`motion`.

On NixOS the dev shell points `PLAYWRIGHT_BROWSERS_PATH` at nixpkgs' `playwright-driver.browsers`
(Playwright's downloaded Chromium does not start there), so `@playwright/test` and
`playwright-core` stay pinned to that driver's version.
