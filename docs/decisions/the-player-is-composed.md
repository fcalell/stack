# The player is the Shell's

Sound is one store the app calls (`player.play(track, queue?)`, `usePlayer()` in `lib/player`) and
one dock the `Shell` draws under the place while a track is loaded, owning the single `<audio>`.
There is no `Player` component to place, no `<audio>` in a screen and no prop on the `Shell`. A
`Track` is a ui-core descriptor (its `peaks` and `markers` optional); with peaks the dock's seek is
a `Waveform`, else a slider. `Waveform` is the one public part, web only, and also stands alone at
record height.

**Why.** A dock that survives navigation must live above the routes, and the only frame above them
is the `Shell`; a component a route placed would stop the sound on every page change and need the
app to wire it. The app's business is which track plays, so that is the whole surface: the dock, the
keys (Space, the horizontal arrows), the media keys and the remembered volume are the roster's.

**Trade-off.** The store is a module singleton, so there is one player per page and an app cannot
mount two. The sound needs a `Shell` (a `Gate` page has no dock; the track would load and stay
silent). `usePlayerTime` re-renders on each frame while playing, so only a part that draws the time
should read it. A `Waveform` takes a constant `Peaks`, not a read: an app that fetches peaks passes
the waveform once they land, and a painted form is a gap to file. The phone's `Shell` draws the same dock (`expo-audio`, the lock screen, a slider for the seek) over
the same store, which lives in ui-core as `createPlayer`; the phone's waveform is not built.
