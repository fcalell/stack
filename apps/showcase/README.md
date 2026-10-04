# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase.

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

Three pages:

- `/`: the roster frames, every component in every cell and state, light and dark side by side.
- `/foundations`: the token page, every role of the contract on the emitted `app.css`, light and
  dark side by side.
- `/layout`: one app composed with the built components, every atom, layout, shared and
  content molecule in its place: the Shell around the place `?place=` names (`deploys`,
  `projects`, `usage`, `domains`, `verify`, `logs`, `assistant`, `members`, `settings`;
  `welcome` is the first run outside the shell), a deploy open by `&record=` (`d1` to `d5`,
  each with its changes, release notes and build log), the changed file its diff shows by
  `&file=` (a path, the first without it) and every query on the page forced by
  `&query=loading|error|missing|empty` (`missing` answers not found, so every read draws its
  "no longer exists" form with Back; `empty` answers every collection with none, so each draws
  its empty form); fixture data, no network. The view toggles sit under the app.

The URL holds the view: `?mode=<light|dark>` sets the page's own mode (without it the page keeps
what the mode script set) and `?density=<touch|desktop>` the density it draws at (`desktop`
without it). The header toggles rewrite the URL and store nothing.
