import { cn } from "@fcalell/ui-core/cn";
import {
	loading,
	type PaintRole,
	paintShape,
	setLoading,
	ticker,
	tuned,
} from "@fcalell/ui-core/paint";
import {
	BUSY_STILL,
	busy,
	decode,
	frame,
	kindOf,
	lockedAt,
	seedOf,
} from "@fcalell/ui-core/scramble";
import type { LoadingSlot } from "@fcalell/ui-core/tokens";
import { paint, SCRAMBLE } from "@fcalell/ui-core/variants";
import { useId, useLayoutEffect, useRef } from "react";
import { reducedNow } from "./media.ts";

// The theme's paint per glyph slot reaches the page as `data-loading-<slot>`
// on the root (`themeModePlugin`, set before first paint), and the shared
// `loading` record reads it once here, so any module that can paint knows it.
const ATTRIBUTES: Record<LoadingSlot, string> = {
	text: "loadingText",
	figure: "loadingFigure",
	id: "loadingId",
};

if (typeof document !== "undefined") {
	const set = document.documentElement.dataset;
	setLoading(
		Object.fromEntries(
			(Object.keys(ATTRIBUTES) as LoadingSlot[])
				.filter((slot) => set[ATTRIBUTES[slot]] === "scramble")
				.map((slot) => [slot, "scramble"]),
		),
	);
}

// Whether the viewer asked for reduced motion, read when a scramble mounts: a
// scramble then stays a still bar (the stylesheet draws the bar and hides the
// glyphs, so the page and the script agree).
const stilled = (node: Element): boolean =>
	reducedNow() || node.closest("[data-still]") !== null;

// The glyphs the ticker writes, in the slot's own face and ink. They are laid
// over the filler (`Painted` sizes the slot with it), clipped to its box, one
// line, so a letter's width never moves what stands after the slot.
const GLYPHS =
	"absolute inset-0 overflow-hidden whitespace-nowrap motion-reduce:hidden";

/** The text a scrambled slot draws: the page's ticker writes the node directly, so a tick renders nothing. */
function Scramble(props: { kind: LoadingSlot; shape: string }) {
	const { kind, shape } = props;
	const node = useRef<HTMLSpanElement>(null);
	const seed = seedOf(useId());
	useLayoutEffect(() => {
		const el = node.current;
		if (!el) return;
		el.textContent = frame(kind, shape, ticker.now(), seed);
		if (stilled(el)) return;
		return ticker.subscribe((tick) => {
			el.textContent = frame(kind, shape, tick, seed);
		});
	}, [kind, shape, seed]);
	return <span ref={node} aria-hidden data-scrambling="" className={GLYPHS} />;
}

/** A glyph slot painted by the scramble: the filler sizes the box (transparent), the generated characters stand over it in the slot's own ink, and the fill returns under reduced motion and in a still frame (`globals.css`). */
export function ScrambledGlyphs(props: { role: PaintRole; at: number }) {
	const { role, at } = props;
	const kind = kindOf(role);
	const shape = paintShape(
		role,
		at,
		document.documentElement.lang || undefined,
	);
	return (
		<span
			aria-hidden
			data-painted=""
			data-scramble=""
			className={cn(
				paint({ kind: "box" }),
				SCRAMBLE,
				"box-decoration-clone select-none",
			)}
		>
			<span className="text-transparent">{shape}</span>
			<Scramble kind={kind} shape={shape} />
		</span>
	);
}

/** A figure or an id arriving, its characters locking from the reading start across `slow` while the layout is the loaded one: tabular digits and the mono face give every glyph one advance. */
export function Decoding(props: { text: string; onDone: () => void }) {
	const { text, onDone } = props;
	const node = useRef<HTMLSpanElement>(null);
	const seed = seedOf(useId());
	useLayoutEffect(() => {
		const el = node.current;
		if (!el) return;
		const rtl = el.closest("[dir]")?.getAttribute("dir") === "rtl";
		const length = Array.from(text).length;
		const start = performance.now();
		let frameId = 0;
		// Keeps the page's clock running for the tail's characters.
		const off = ticker.subscribe(() => {});
		// The locks follow the clock frame by frame; the characters not yet locked
		// change at the page's tick.
		const draw = () => {
			const locked = lockedAt(performance.now() - start, length, tuned.slow);
			el.textContent = decode(text, locked, ticker.now(), seed, rtl);
			if (locked >= length) onDone();
			else frameId = requestAnimationFrame(draw);
		};
		draw();
		return () => {
			cancelAnimationFrame(frameId);
			off();
		};
	}, [text, seed, onDone]);
	return <span ref={node} aria-hidden />;
}

/** The busy glyph's text: three mono glyphs the page's ticker cycles, `···` under reduced motion. */
export function BusyGlyphs() {
	const node = useRef<HTMLSpanElement>(null);
	const seed = seedOf(useId());
	useLayoutEffect(() => {
		const el = node.current;
		if (!el) return;
		el.textContent = busy(ticker.now(), seed);
		if (stilled(el)) {
			el.textContent = BUSY_STILL;
			return;
		}
		return ticker.subscribe((tick) => {
			el.textContent = busy(tick, seed);
		});
	}, [seed]);
	return <span ref={node} aria-hidden />;
}

/** Whether the page's busy glyph is the scramble's three glyphs: the theme scrambles its text. */
export const busyScrambles = (): boolean => loading.text === "scramble";
