# Audio

Sound a viewer plays is the player, never an `<audio>` in a screen. The app passes the player one
output, calls `player` with a `Track`, and gives the `Shell` a `Dock` for its `foot`; the dock stands
under the place while a track is loaded, and the sound goes on through navigation. A waveform on its
own is a `Waveform`. Nothing here mounts by default: an app that plays no sound carries no audio.

```tsx
import { Dock } from "@fcalell/plugin-react-ui/components/dock";
import { Waveform } from "@fcalell/plugin-react-ui/components/waveform";
import { audioOutput, connectOutput, player, usePlayer, windowQueue } from "@fcalell/plugin-react-ui/lib/player";
```

## Set it up

```tsx
connectOutput(audioOutput()); // once, before the app renders

<Shell places={places} foot={<Dock />}>…</Shell>
```

- `audioOutput()` is the browser's audio element as the player's `Output`, made when the first track
  loads. Another engine is an `Engine` (`(report) => Output`, `@fcalell/ui-core/player`): the store
  tells it to `load`, `play` and `pause`, and it reports the sound's events through `report`.
- `player.play` and `player.load` throw until an output is passed, so a forgotten `connectOutput` fails loudly.
- `createPlayer` (`@fcalell/ui-core/player`) makes a store over a `PlayerHost`; `lib/player` is the
  one the app calls, so there is one player per page.

## Play a track

A `Track` (`@fcalell/ui-core/descriptors`) is the file and what is known of it:

```tsx
const toTrack = (t: Song): Track => ({
  src: t.url,
  title: t.title,
  line: t.artist,
  image: t.cover,
  duration: t.seconds,
  peaks: { values: t.peaks },
});

<Button label="Play" onAct={() => player.play(toTrack(song), songs.map(toTrack))} />
```

- Call `player.play` from a press: a browser holds back sound nothing asked for, and the track then
  waits paused.
- The second argument is the queue Next and Previous walk; leave it out and the track plays alone.
  The queue stays while the tracks played are in it. A track is the same track by its `key`, else its
  `src`.
- A queue too long to hold (a `Table` over a window read of tens of thousands of rows) is a
  provider: `queue` takes `{ next(current), previous(current) }` instead of a list, each
  returning the `Track` beside `current` (or `undefined` at an end), now or as a promise. The
  player asks it once as a track loads, so the dock knows whether a Next exists before it is
  pressed (it is shown until the provider answers there is none), and `ended` and the media keys
  walk the same way. A provider is kept while the tracks played are the ones it gave. Over a
  window read, `windowQueue` is the provider; it fetches the rows beside the playing one through the
  read's own pages, in its order and filter:

  ```tsx
  // useWindow: @fcalell/plugin-api/tanstack-query
  const rows = useWindow(tracks)?.rows ?? [];
  <Table items={tracks} row={{ id: (t) => t.id }} onOpen={(id) => {
    const at = rows.findIndex((t) => t?.id === id);
    player.play(toTrack(rows[at]), windowQueue(tracks, { track: toTrack, at }));
  }} />
  ```
  `track` may return a promise, for an address signed per track (give the track a `key`, since its address changes): it runs for each row of a page
  as the page loads.
- `player.load(track)` cues it paused; `pause`, `toggle`, `seek(seconds)`, `skip(seconds)`,
  `setVolume(0..1)`, `mute()`, `playNext`, `playPrevious` and `close` do what they say.
- `usePlayer()` reads `track`, `playing`, `failed`, `volume`, `muted`, `queue`, `next` and
  `previous` (once a provider has answered), `queued` and `hasNext` with the same commands, so a row can draw its own playing state:
  `usePlayer().track?.src === row.src`. `usePlayerTime()` reads `{ time, duration }` and draws
  again on each frame while it plays: use it only where the time is drawn.

**Check:** the dock stands under the place across a route change, with the audio uninterrupted.

## The dock

It draws the picture, the name over its line, previous, play or pause (the primary glyph) and next
(the first and last only where there is a queue), the elapsed time, the seek, the total, mute with a
volume slider and a close. The name, the transport and the seek share the bar's width by flex, so the
transport stands at its centre. A track with no `image`, or one that fails to load, draws the tile's
failed form, so the name keeps its place. The seek is a `Waveform` where the track has `peaks` and a
slider where not. On touch the transport and the name stand on a first bar and the seek on a second,
with no volume: the device's own buttons set it. Volume and mute are kept from one visit to the next.

While it stands the dock takes Space and the horizontal arrows anywhere that is not typing or a
control that takes the key itself (a `Table`'s grid takes them where it acts on them), and the
system's media keys and lock screen drive the same player. A `Dock` takes no props.

## A waveform on its own

```tsx
<Waveform
  label="Seek the track"
  peaks={{ values: song.peaks }}
  duration={song.seconds}
  at={time}
  onSeek={player.seek}
/>
```

`peaks.values` is one 0..1 magnitude per value, or with `paired: true` each pair a stretch's
lowest and highest sample (-1..1); an array or a typed array, at any resolution. `fit="bar"`
stands at the control height (in a `Toolbar`-height bar); the default stands at the waveform size
in a `Pane` or a `Card`. It does not move itself: `at` is the playhead, so a standalone waveform
takes `usePlayerTime().time` or the app's own clock. A drag holds the pointer as the playhead and
`onSeek` hears one second, on release; the keys seek at once.

**Check:** a drag on the waveform moves the playhead and seeks once on release, and Left and Right
move it five seconds.
