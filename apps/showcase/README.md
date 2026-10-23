# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase, and the first consumer of the screens
workbench (`@fcalell/plugin-screens`).

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

## The app

The routes (`src/app/routes/`) are one app composed from the built components, plus two pages:

- `/foundations`: the token page, every role of the contract on the emitted `app.css`, light and
  dark side by side. `/` redirects to it. The URL holds the view: `?mode=<light|dark>` sets the
  page's own mode (without it the page keeps what the mode script set) and `?density=<touch|desktop>`
  the density it draws at (`desktop` without it); the header toggles rewrite the URL and store
  nothing.
- `/tv`: a screen read from across a room, a place with `distance="room"` holding a
  `Stats` in one column, dark unless `?mode=light`. It carries no toggles and takes no density:
  the room scale follows the window, so a browser at 1280, 1920 and 3840 wide draws those screens.
- In the Shell (the pathless layout `_app`): `/deploys`, `/deploys/$deployId` and
  `/deploys/$deployId/steps/$stepId` (one place whose layout route holds the list Pane and the
  router's `Outlet`: a deploy opens as the Panes after the list, a step as the Pane after them;
  `?file=` names the changed file whose diff is open),
  `/projects`, `/usage`, `/domains`, `/domains/verify` (a covering Pane pushed over Domains), `/logs`,
  `/assistant`, `/members`, `/settings` and `/home`.
- Outside the Shell: `/sign-in` (the email step, then the code step)
  and `/connect` (the first of two Connect steps), each a `Gate`.

A place calls typed procedures through the generated client's `read` and draws their states through
the frames (`Pane`, `Section`, `Sheet`, `Form`) that hold the read, its leaves and collections
taking selections of it. The procedures are `src/worker/routes/`: zod input and output schemas and a stub
handler each, so a run against the dev worker draws every collection empty and every record not
found. The data a place shows is `src/app/fixtures.ts`, which answers every procedure, and an
example value for the route params (`deployId`, `stepId`).

## The screens workbench

```bash
pnpm --filter showcase exec stack screens dev   # Storybook on every route of the app, on :6006
pnpm --filter showcase test-screens --screen <title>  # the screens you work on, headlessly
```

Every route is drawn in data, loading, error, empty and not found, light and dark, at either
density: the toolbar pins the mode and the density, and no request leaves MSW. A mutation always
answers from its fixture, whatever state the screen is forced into. The test run opens each screen
in every state, light and dark, and fails it on an axe violation, a horizontal overflow at 320, 1280
or 1920 px, a finding of the render walk, or a console error or warning.

## The roster

The roster is in Storybook: one story per component and accessibility-relevant state (`rest`,
`disabled`, `loading`, `error`, `empty`, `selected`), every cell of that component, light and dark
side by side, at the toolbar's density (desktop or touch). The `rest` story takes a `cell` control
to browse one cell. Hover, press and focus are drawn nowhere: drive the real component in its story.

```bash
pnpm stories        # from the repo root: builds the workspace chain, then Storybook on :6006
```

`.storybook/` holds the roster's own config: the story globs, `rosterPlugin` and the generator of
`stories/` (from the roster, gitignored). Its Vite config is `.stack/storybook.vite.config.ts`, which
`stack generate` derives from the slots the app's own config renders from: the same config without
the router plugin and the frame-blocking headers, with the dependency optimizer started.
