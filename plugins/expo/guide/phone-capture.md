# Capture a phone screen

The design critique drives the app the [render page](./phone-render.md) started, in the same
shell and directory, with its `DEV`, `METRO`, `PKG`, `SCHEME` and `worker_pid`.

## Open a route, then capture it at each width and mode

`open.yaml` launches the route by deep link and dismisses Reanimated's warning toast by its
point, since its close act has no label; `shot.yaml` screenshots. Each waits on a known text
first: the first frames after a launch arrive seconds late. Pass every variable with `-e`: a
default in the flow's own `env:` overrides it.

```yaml
# open.yaml
appId: ${PKG}
---
- stopApp
- openLink: ${SCHEME}://${ROUTE}
- extendedWaitUntil: { visible: "${WAIT}", timeout: 180000 }
- extendedWaitUntil: { visible: Open debugger to view warnings., timeout: 10000, optional: true }
- runFlow:
    when: { visible: Open debugger to view warnings. }
    commands: [{ tapOn: { point: "92%,92%" } }]
```

```yaml
# shot.yaml
appId: ${PKG}
---
- extendedWaitUntil: { visible: "${WAIT}", timeout: 60000 }
- waitForAnimationToEnd
- takeScreenshot: ${NAME}-${MODE}-${WIDTH}
```

The app follows the system mode and the density live, so a state opens once and every width
and mode is captured over it:

```sh
m() { maestro "$1" --no-reinstall-driver "${@:2}"; }
m test -e PKG=$PKG -e SCHEME=$SCHEME -e ROUTE=notes -e WAIT=Notes open.yaml
for MODE in light dark; do
  adb shell cmd uimode night $([ $MODE = dark ] && echo yes || echo no)
  for WIDTH in 390 320; do
    adb shell wm density $((1080 * 160 / WIDTH))
    m test --test-output-dir=shots -e PKG=$PKG -e WAIT=Notes -e NAME=empty \
      -e MODE=$MODE -e WIDTH=$WIDTH shot.yaml
    m hierarchy > empty-$MODE-$WIDTH.json
  done
done
```

A screenshot lands in `shots/<run>/<flow>/takeScreenshot/`. Each Maestro call costs about 20 s,
so one flow walks a set of states, a screenshot after each.

## Type

Maestro's `inputText` drops characters. Tap the field in a flow, then type through the device,
`%s` standing for a space:

```sh
adb shell input text 'Buy%soat%smilk'
```

## Measure

`maestro hierarchy` prints each element's bounds in px (`[x1,y1][x2,y2]`), its text, its
accessibility label and its state. A size in dp is px × 160 / the density:

```sh
echo $(( (y2 - y1) * 160 / $(adb shell wm density | grep -o '[0-9]*$') ))
```

The shell's ImageMagick reads the screenshot: a pixel's colour, and the contrast ratio between
the lightest and darkest pixels of a box, such as a label's bounds over its fill.

```sh
magick shot.png -format '%[hex:p{540,2090}]\n' info:
magick shot.png -crop 240x42+420+552 -colorspace LinearGray \
  -format '%[fx:(maxima+0.05)/(minima+0.05)]\n' info:
```

## Toasts and warnings

A toast is gone before `maestro hierarchy` returns: judge it from a screenshot the flow takes
right after the act. The app's JavaScript warnings and errors arrive in `metro.log`, the output
of `stack expo dev`.

## Hold a query's states

The worker the app calls holds them.

| State | How |
| --- | --- |
| Empty | Stop the worker, delete the local database (`.wrangler/state`) with `stack db reset`, start it again |
| Pending | `kill -STOP $(worker_pid)`: the request is accepted, never answered. `kill -CONT` releases it |
| Failed | Stop the worker: the query fails after the client's single retry. Start it, tap Retry to load |

```sh
kill -- -$DEV; kill $(worker_pid) 2>/dev/null           # stop the worker
stack db reset                                           # empty
setsid stack dev > dev.log 2>&1 & DEV=$!                 # start it again
until [ -n "$(worker_pid)" ]; do sleep 1; done
```

## Judge with motion on

The app reads the animation scales when it starts, so set them to 1 and open the route again
with `open.yaml`; set them back to 0 after.

```sh
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global $k 1
done
```
