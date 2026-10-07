# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase.

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

The roster is in Storybook, three kinds of story:

- **Component stories**: one per component and accessibility-relevant state (`rest`, `disabled`,
  `loading`, `error`, `empty`, `selected`), every cell of that component, light and dark side by
  side, at the toolbar's density (desktop or touch). The `rest` story takes a `cell` control to
  browse one cell. Hover, press and focus are drawn nowhere: drive the real component in its story.
- **Page stories** (`Pages/`): each place of the `/layout` app (`deploys`, `projects`, `usage`,
  `domains`, `logs`, `assistant`, `members`, `settings`, `home`, and `welcome`, `sign-in`, `connect`
  outside the shell), the Screen pushed over `domains` (`verify`) and an open record (`deploy-d1`),
  generated from the places list, one page in one mode per story.
- **Behaviour stories** (`behaviour/*.stories.tsx`, written by hand): the real component driven by
  keyboard, with a play function asserting the rubric's widget-behaviour floor: Sheet (and a
  `confirm()` decision), Menu, Select, Picker, OptionList, SegmentedControl, Table (grid cursor),
  List (tree), Slider, InputOtp, Toast and Gate, and a Sheet docked in a Place's foot. Screen, Split
  and Shell own no focus move or key handling of their own, so they have none.

```bash
pnpm stories        # from the repo root: builds the workspace chain, then Storybook on :6006
pnpm stories:test   # every story in a headless browser: axe on each, the play tests run
```

The test run is desktop density at a 1280 by 800 viewport; touch is a toolbar toggle. Every story runs every axe rule except the document-structure ones (landmarks, heading order, skip links; `.storybook/preview.tsx` lists them). Playwright's bundled browser is the
default. Where none is installed (NixOS), point `CHROME_PATH` at a Chrome:
`CHROME_PATH=$(which google-chrome-stable) pnpm stories:test`. `.storybook/` holds the config;
`stories/` is generated from the roster and the places list and gitignored.

Three pages stay in the app (`/` redirects to `/foundations`):

- `/foundations`: the token page, every role of the contract on the emitted `app.css`, light and
  dark side by side.
- `/layout`: one app composed with the built components, every atom, layout, shared and
  content molecule in its place: the Shell around the place `?place=` names (`deploys`,
  `projects`, `usage`, `domains`, `logs`, `assistant`, `members`, `settings`, `home`;
  `welcome` is the first run, `sign-in` the email step and then the code step, and `connect` the first
  of two Connect steps, each a `Gate` outside the shell, `&query=error` standing a warn banner
  over either), each place at its own route with the view, a Screen
  pushed over it by `&screen=` (`verify`, over `domains`), a deploy open by `&record=` (`d1` to `d5`,
  each with its changes, release notes and build log), the changed file its diff shows by
  `&file=` (a path, the first without it) and every query on the page forced by
  `&query=loading|error|missing|empty` (`missing` answers not found, so every read draws its
  "no longer exists" form with Back; `empty` answers every collection with none, so each draws
  its empty form); fixture data, no network. The view toggles sit under the app.
- `/tv`: a screen read from across a room, a `Place` with `distance="room"` holding a `Stat` and
  a `Stats` in one column, dark unless `?mode=light`. It carries no toggles and takes no density:
  the room scale follows the window, so a browser at 1280, 1920 and 3840 wide draws those screens.

The URL holds the view: `?mode=<light|dark>` sets the page's own mode (without it the page keeps
what the mode script set) and `?density=<touch|desktop>` the density it draws at (`desktop`
without it). The header toggles rewrite the URL and store nothing.
