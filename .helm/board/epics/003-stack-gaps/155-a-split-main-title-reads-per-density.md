---
id: 003-155
status: done
sessions: {}
---
# react-ui: a Place's title can read per density, so a System section's record reads "‹ Repos +" at the phone

## Goal
Stead's System place draws sections (Repos, Leads, Sinks) in a `Split`'s main and a record beside it (github.com/fcalell/stead, `packages/server/src/app/routes/system/route.tsx` lines 40 to 60, `title` per section; design/07-interface.md line 1325 draws the phone's repo screen as "‹ Repos +": the section as the title, with its back and its create act). At 390 px the repo screen reads "System" (22/600) over a "Repos" section heading, and the repo ("sailward") under the same System title. Evidence: System repos critique unit u9, shots `list-390-light`, `repo-390-light` (Stead 948b7ec, stack 5564217).

## Approach
The Place's `title` is one string at every density, and the app cannot make it density-aware inside a Split's main: `useTouch` (plugin-react-ui `src/ui/lib/media.ts:55`) is not exported from the package index (`dist/index.js` and `dist/index.d.ts` hold no `useTouch`), so the app cannot pick "System" on the desktop and "Repos" on the phone, and a local media query would be a workaround. 003-95 covers the top bar's act inset and 003-134 a record beside the main drawing one head; neither lets a section stand as the phone's title with its create act.

## Acceptance criteria
- [ ] A Place (or Split) lets the app give a title for the phone different from the desktop's, or exports the density read, so a section's list reads "Repos" with its create act at the phone and the record under it reads "‹ Repos".
- [ ] The Place showcase holds the two titles at 390 and 1440.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): none; see Ruled.

## Ruled
No `touchTitle` and no exported `useTouch`: either lets an app fork its UI per density, which the system decides. The app titles its Place with the section's name at every density (`Repos`), and the sidebar item and the tab carry `System`, which reads "‹ Repos +" on the phone with no new surface. `plugins/react-ui/guide/rules.md` and `plugins/native-ui/guide/rules.md` state it: a Place's title is the page's name at every density.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/shell/report.md`).
