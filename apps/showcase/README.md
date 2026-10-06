# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase.

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

Four pages:

- `/`: the roster frames, every component in every cell and state, light and dark side by side.
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
