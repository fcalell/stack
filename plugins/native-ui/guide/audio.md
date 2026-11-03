# Audio

Sound the phone plays is the player and its dock, never an audio call in a screen. The app calls
`player` with a `Track`; the `Shell` draws the dock above the tab bar while one is loaded and owns
the one audio player (`expo-audio`), so the sound goes on through navigation, in the background and
on the lock screen. It is the web's player (`node_modules/@fcalell/plugin-react-ui/guide/audio.md`)
with the same store and commands, `@fcalell/ui-core/player`'s rules.

```tsx
import { player, usePlayer, windowQueue } from "@fcalell/plugin-native-ui/lib/player";
```

## Play a track

```tsx
const toTrack = (t: Song): Track => ({
  src: t.url,
  title: t.title,
  line: t.artist,
  artwork: t.cover,
  duration: t.seconds,
  headers: { authorization: `Bearer ${key}` }, // sent with the file; the web's <audio> cannot
});

<Section items={songs.map((s) => ({ key: s.id, title: s.title, onOpen: () => player.play(toTrack(s), songs.map(toTrack)) }))} />
```

- `play(track, queue?)`, `load`, `pause`, `toggle`, `seek`, `skip`, `setVolume`, `mute`, `playNext`,
  `playPrevious` and `close` are the web's, and so are `usePlayer()` (`track`, `playing`, `failed`,
  `queued`, `hasNext`, …) and `usePlayerTime()` (`{ time, duration }`, drawing again on each frame
  while it plays: use it only where the time is drawn). A row draws its playing state by
  `usePlayer().track?.src === row.src`.
- The queue is a list, or a provider for a list too long to hold: over a window read,
  `windowQueue(read, { track, at })` fetches the rows beside the playing one through the read's own
  pages.
- `headers` is the phone's way to send a credential with the file and with the dock's cover. The
  lock screen's cover is fetched by the system from the address alone, so a cover behind a
  credential shows there only when its address carries its own access (a signed URL).
- `track` of `windowQueue` may return a promise, for an address signed per track (give the track a `key`, since its address changes): it runs for each
  row of a page as the page loads, and a rejection fails that page, which the next press asks for
  again.
- The dock is two bars: the artwork, the name over its line, previous, play or pause, next and close; and
  the elapsed time, the seek and the total. It has no volume: the device's buttons set it, and
  `setVolume` and `mute` act on the player only.
- The lock screen and the system's media controls show the title, the line and the artwork, and play,
  pause and seek drive the player. `expo-audio` does not report the system's Next and Previous, so
  those two are the dock's.
- Background playback is on: `nativeUi()` adds the `expo-audio` config plugin (the `audio`
  background mode on iOS, the media-playback service on Android), so it takes a new native build;
  Expo Go plays in the foreground.

**Check:** the dock stands above the tab bar across a route change, with the audio uninterrupted,
and the lock screen shows the track.
