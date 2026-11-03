# Audio

Sound a viewer plays is the player and its dock, never an `<audio>` in a screen. The app calls
`player` with a `Track`; the `Shell` draws the dock under the place while one is loaded and owns the
one audio element, so the sound goes on through navigation. A waveform on its own is a `Waveform`.

```tsx
import { player, usePlayer } from "@fcalell/plugin-react-ui/lib/player";
import { Waveform } from "@fcalell/plugin-react-ui/components/waveform";
```

## Play a track

A `Track` (`@fcalell/ui-core/descriptors`) is the file and what is known of it:

```tsx
const toTrack = (t: Song): Track => ({
  src: t.url,
  title: t.title,
  meta: t.artist,
  artwork: t.cover,
  duration: t.seconds,
  peaks: { values: t.peaks },
  markers: t.cues.map((c) => ({ at: c.seconds, label: c.name, family: "red" })),
});

<Button label="Play" onAct={() => player.play(toTrack(song), songs.map(toTrack))} />
```

- Call `player.play` from a press: a browser holds back sound nothing asked for, and the track then
  waits paused.
- The second argument is the queue Next and Previous walk; leave it out and the track plays alone.
  The queue stays while the tracks played are in it. A track is the same track by its `key`, else its
  `src`.
- `player.load(track)` cues it paused; `pause`, `toggle`, `seek(seconds)`, `skip(seconds)`,
  `setVolume(0..1)`, `mute()`, `playNext`, `playPrevious` and `close` do what they say.
- `usePlayer()` reads `track`, `playing`, `failed`, `volume`, `muted`, `queue`, `next` and
  `previous` with the same commands, so a row can draw its own playing state:
  `usePlayer().track?.src === row.src`. `usePlayerTime()` reads `{ time, duration }` and draws
  again on each frame while it plays: use it only where the time is drawn.

**Check:** the dock stands under the place across a route change, with the audio uninterrupted.

## The dock

It draws the cover, the name over its meta, previous, play or pause and next (the first and last
only where there is a queue), the elapsed time, the seek, the total, mute with a volume slider and
a close. The seek is a `Waveform` where the track has `peaks` (its `markers` as flags) and a slider
where not. On touch the transport and the name stand on a first bar and the seek on a second, with
no volume: the device's own buttons set it. Volume and mute are kept from one visit to the next.
The system's media keys and lock screen drive the same player.

Keys, anywhere that is not typing or a control that takes the key itself: Space plays or pauses,
Left and Right skip five seconds (Shift: one). On a focused `Waveform`: the same arrows, Page Up
and Page Down thirty seconds, Home and End to the ends.

## A waveform on its own

```tsx
<Waveform
  label="Seek the track"
  peaks={{ values: song.peaks }}
  duration={song.seconds}
  at={time}
  onSeek={player.seek}
  markers={cues}
/>
```

`peaks.values` is one 0..1 magnitude per value, or with `paired: true` each pair a stretch's
lowest and highest sample (-1..1); an array or a typed array, at any resolution. A `Marker` is
`{ at, label, family? }`: its hue the chip family, its label drawn at record height. `fit="bar"`
stands at the control height (in a `Toolbar`-height bar); the default stands at the waveform size
in a `Pane` or a `Card`. It does not move itself: `at` is the playhead, so a standalone waveform
takes `usePlayerTime().time` or the app's own clock.

**Check:** a press or a drag on the waveform moves the playhead, and Left and Right move it five
seconds.
