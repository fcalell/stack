# showcase

The app that serves `@fcalell/plugin-react-ui`'s showcase.

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

Two pages, each drawing light and dark side by side:

- `/`: the roster frames, every component in every cell and state.
- `/foundations`: the token page, every role of the contract on the emitted `app.css`.

The URL holds the view: `?mode=<light|dark>` sets the page's own mode (without it the page keeps
what the mode script set) and `?density=<touch|desktop>` the density it draws at (`desktop`
without it). The header toggles rewrite the URL and store nothing.
