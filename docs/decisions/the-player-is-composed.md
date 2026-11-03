# The player is composed

Sound is a store the app calls (`player.play(track, queue?)`, `usePlayer()` in `lib/player`) and a
`Dock` the app gives the `Shell`'s `foot` (`<Shell foot={<Dock />}>`). The `Shell` has a generic `foot`
region and owns no sound: no audio element, no dock by default, no global key, no media session.
The engine is an `Output` the app passes once (`connectOutput(audioOutput())`): the browser's audio
element on the web, `@fcalell/plugin-native-ui/audio/expo` on the phone. `Dock`, `Waveform`,
`createPlayer`, `QueueProvider` and `windowQueue` are parts nothing mounts by default. A `Track` is a
ui-core descriptor (`peaks` optional); with peaks the dock's seek is a `Waveform`, else a slider.

**Why.** A dock that survives navigation must live above the routes, and the `Shell`'s `foot` is the
slot above them that stack already owns; an app that plays sound fills it, and one that does not pays
nothing: no audio element, no listener, no `expo-audio`. The sound is the app's to choose, so the
engine comes through the `Output` seam instead of a dependency the design system carries. The `Dock`
owns what only it needs while mounted: Space and the horizontal arrows, and the system's media keys.

**Trade-off.** The store is a module singleton, so there is one player per page and an app cannot
mount two. A `Dock` outside a `Shell`'s `foot` loses the sound's survival across navigation. Until an
output is passed the store moves its state and makes no sound. `usePlayerTime` re-renders on each
frame while playing, so only a part that draws the time should read it. A `Waveform` takes a constant
`Peaks`, not a read: an app that fetches peaks passes the waveform once they land. The phone's
`expo-audio` is an optional peer, and the app adds it and its config plugin itself.
