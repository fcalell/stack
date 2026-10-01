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
- `/layout`: the layout layer composed with the built components into five product frames, at
  the URL's mode.

The URL holds the view: `?mode=<light|dark>` sets the page's own mode (without it the page keeps
what the mode script set) and `?density=<touch|desktop>` the density it draws at (`desktop`
without it). The header toggles rewrite the URL and store nothing.
