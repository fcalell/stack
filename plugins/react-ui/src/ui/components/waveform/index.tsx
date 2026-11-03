import { cn } from "@fcalell/ui-core/cn";
import type { Peaks } from "@fcalell/ui-core/descriptors";
import { trackTime } from "@fcalell/ui-core/player";
import { WAVEFORM_BAR, WAVEFORM_RECORD } from "@fcalell/ui-core/variants";
import {
	type Columns,
	columns,
	momentAt,
	seekKey,
	shareOf,
	type WaveformFit,
} from "@fcalell/ui-core/waveform";
import {
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useHeldDraft } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { inkOf, inkVersion, onInkChange } from "../../lib/ink.ts";

/** A track's peaks drawn as a slider along its length. */
export interface WaveformProps extends Closed {
	/** What the waveform seeks: the slider's accessible name (a short phrase). */
	label: string;
	/** The track's amplitude, from its start to its end; any resolution, reduced to the width. */
	peaks: Peaks;
	/** The track's length in seconds. */
	duration: number;
	/** The playhead's place in seconds: the played part up to it stands in the accent, the rest in the edge. */
	at: number;
	/** Hears the second the viewer lets the playhead go at. A drag holds the pointer as the playhead and seeks once, on release (a plain press is a drag that does not move); Left and Right move it five seconds (Shift: one), Page Up and Page Down thirty, Home and End to the ends, each a seek at once. Return the seek's promise and the playhead holds while it pends; a refusal puts it back, with its reason. The playhead only moves when `at` does. */
	onSeek: (seconds: number) => unknown;
	/** `bar` stands at the control's height (a bar, the player dock); `record`, the default, at the waveform size. */
	fit?: WaveformFit;
}

const ROOT =
	"relative w-full cursor-pointer touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const CANVAS = "absolute inset-0 size-full";
// The columns' width and the gap between them, and the playhead's, in CSS pixels.
const COLUMN = 2;
const GAP = 1;
const MIN_COLUMN = 1;
const HEAD = 2;

interface Measured {
	width: number;
	height: number;
	ratio: number;
}

/** The peaks of a track drawn on a canvas as columns, the played part in the accent and the rest in the edge, with a playhead; a slider the pointer and the keys seek along. Standing in a bar it is the player dock's seek; at record height it stands alone in a `Pane` or a `Card`. */
export function Waveform(props: WaveformProps) {
	const { label, duration, onSeek, fit = "record" } = props;
	// The pointer holds the playhead while it drags; the seek lands on release.
	const [pointer, hold] = useState<number>();
	const draft = useHeldDraft(props.at);
	const at = pointer ?? draft.value;
	const root = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const latest = useRef(props);
	const size = useRef<Measured>({ width: 0, height: 0, ratio: 1 });
	const reduced = useRef<{ peaks: Peaks; count: number; value: Columns }>(null);
	const frame = useRef(0);
	const ink = useRef<{ version: number; roles: Map<string, string> }>({
		version: -1,
		roles: new Map(),
	});

	const draw = useCallback(() => {
		frame.current = 0;
		const element = canvas.current;
		const context = element?.getContext("2d");
		if (!element || !context) return;
		const now = latest.current;
		const { width, height } = size.current;
		const ratio = window.devicePixelRatio || 1;
		size.current.ratio = ratio;
		const pixelWidth = Math.max(1, Math.round(width * ratio));
		const pixelHeight = Math.max(1, Math.round(height * ratio));
		if (element.width !== pixelWidth) element.width = pixelWidth;
		if (element.height !== pixelHeight) element.height = pixelHeight;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);
		if (width <= 0 || height <= 0) return;

		// The roles' values are read off the element once per mode, not per frame.
		if (ink.current.version !== inkVersion()) {
			ink.current = { version: inkVersion(), roles: new Map() };
		}
		const paint = (role: string) => {
			let value = ink.current.roles.get(role);
			if (value === undefined) {
				value = inkOf(element, role);
				ink.current.roles.set(role, value);
			}
			return value;
		};

		const middle = height / 2;
		const count = Math.max(
			MIN_COLUMN,
			Math.floor((width + GAP) / (COLUMN + GAP)),
		);
		if (reduced.current?.peaks !== now.peaks || reduced.current.count !== count)
			reduced.current = {
				peaks: now.peaks,
				count,
				value: columns(now.peaks, count),
			};
		const { low, high } = reduced.current.value;
		const step = width / count;
		const share = shareOf(now.at, now.duration);
		const snap = (value: number) => Math.round(value * ratio) / ratio;
		const played = paint("toggle-on");
		const rest = paint("edge-strong");
		for (let index = 0; index < count; index++) {
			const left = snap(index * step);
			const right = snap((index + 1) * step - GAP);
			const top = middle + (high[index] ?? 0) * -(height / 2);
			const bottom = middle + (low[index] ?? 0) * -(height / 2);
			// A silent column keeps one pixel, so the track reads as a line.
			const shown = Math.max(bottom - top, 1 / ratio);
			context.fillStyle = (index + 0.5) / count <= share ? played : rest;
			context.fillRect(left, top, Math.max(1 / ratio, right - left), shown);
		}

		const head = Math.min(
			width - HEAD,
			Math.max(0, snap(share * width - HEAD / 2)),
		);
		context.fillStyle = paint("ink-body");
		context.fillRect(head, 0, HEAD, height);
	}, []);

	const schedule = useCallback(() => {
		if (!frame.current) frame.current = requestAnimationFrame(draw);
	}, [draw]);

	// Every render hands the draw its latest props; the draw itself is one frame
	// later, however many renders came.
	useLayoutEffect(() => {
		latest.current = { ...props, at };
		schedule();
	});

	useEffect(() => {
		const element = root.current;
		if (!element) return;
		// The canvas's backing store is its box in device pixels, which only the
		// layout knows: CSS cannot size a bitmap.
		const measure = () => {
			const box = element.getBoundingClientRect();
			size.current = { ...size.current, width: box.width, height: box.height };
			schedule();
		};
		measure();
		const watch = new ResizeObserver(measure);
		watch.observe(element);
		const stop = onInkChange(schedule);
		return () => {
			watch.disconnect();
			stop();
			cancelAnimationFrame(frame.current);
			frame.current = 0;
		};
	}, [schedule]);

	const momentOf = (event: PointerEvent<HTMLDivElement>) => {
		const box = event.currentTarget.getBoundingClientRect();
		return momentAt(event.clientX - box.left, box.width, duration);
	};

	const seek = (to: number) => draft.change(to, () => onSeek(to));

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const to = seekKey(event.key, event.shiftKey, at, duration);
		if (to === undefined) return;
		event.preventDefault();
		seek(to);
	};

	return (
		<div
			ref={root}
			role="slider"
			tabIndex={0}
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={Math.round(duration)}
			aria-valuenow={Math.round(at)}
			aria-valuetext={trackTime(at)}
			className={cn(fit === "bar" ? WAVEFORM_BAR : WAVEFORM_RECORD, ROOT)}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				hold(momentOf(event));
			}}
			onPointerMove={(event) => {
				if (event.currentTarget.hasPointerCapture(event.pointerId))
					hold(momentOf(event));
			}}
			onPointerUp={(event) => {
				if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
				event.currentTarget.releasePointerCapture(event.pointerId);
				hold(undefined);
				seek(momentOf(event));
			}}
			onPointerCancel={() => hold(undefined)}
			onKeyDown={onKeyDown}
		>
			<canvas ref={canvas} aria-hidden className={CANVAS} />
		</div>
	);
}
