import {
	loading,
	type PaintRole,
	paintShape,
	scrambled,
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
import { memo, useEffect, useId, useState, useSyncExternalStore } from "react";
import { I18nManager, Text as RNText } from "react-native";
import { reducedNow } from "./motion";

// The generated characters of a scrambled slot, in the ink of the text that
// holds it: the page's ticker is this component's store, so a tick renders this
// text alone (it is memoised on its props, which never change with a tick).
const Scramble = memo(function Scramble(props: {
	kind: LoadingSlot;
	shape: string;
	seed: number;
}) {
	const tick = useSyncExternalStore(ticker.subscribe, ticker.now, ticker.now);
	return <RNText>{frame(props.kind, props.shape, tick, props.seed)}</RNText>;
});

/** Whether a role's slot draws the scramble on the phone: the theme scrambles its kind, the slot is one line and the system has not asked for reduced motion (a still bar then). */
export const scramblesNow = (role: PaintRole): boolean =>
	scrambled(role) && !reducedNow();

/** A glyph slot painted by the scramble, set inside the slot's own `PaintText`: its characters stand where the filler would, in the ink of the text that holds them. */
export function ScrambledText(props: { role: PaintRole; at: number }) {
	const { role, at } = props;
	const kind = kindOf(role);
	return (
		<Scramble kind={kind} shape={paintShape(role, at)} seed={seedOf(useId())} />
	);
}

// A figure or an id arriving, its characters locking from the reading start
// across `slow` while the layout is the loaded one: tabular digits and the
// mono face give every glyph one advance. The locks follow the clock frame by
// frame; the characters not yet locked change at the page's tick.
export function Decoding(props: {
	text: string;
	onDone: () => void;
	className?: string;
	style?: unknown;
	numberOfLines?: number;
}) {
	const { text, onDone } = props;
	const seed = seedOf(useId());
	const [start] = useState(() => Date.now());
	const [now, setNow] = useState(start);
	const tick = useSyncExternalStore(ticker.subscribe, ticker.now, ticker.now);
	const length = Array.from(text).length;
	const locked = lockedAt(now - start, length, tuned.slow);
	useEffect(() => {
		let frameId = 0;
		const run = () => {
			const at = Date.now();
			setNow(at);
			if (lockedAt(at - start, length, tuned.slow) >= length) onDone();
			else frameId = requestAnimationFrame(run);
		};
		frameId = requestAnimationFrame(run);
		return () => cancelAnimationFrame(frameId);
	}, [start, length, onDone]);
	return (
		<RNText
			className={props.className}
			style={props.style as never}
			numberOfLines={props.numberOfLines}
			importantForAccessibility="no"
		>
			{decode(text, locked, tick, seed, I18nManager.isRTL)}
		</RNText>
	);
}

// The busy glyph's text: three mono glyphs the page's ticker cycles, `···`
// under reduced motion.
export function BusyGlyphs(props: { className?: string; style?: unknown }) {
	const tick = useSyncExternalStore(ticker.subscribe, ticker.now, ticker.now);
	const seed = seedOf(useId());
	return (
		<RNText
			numberOfLines={1}
			className={props.className}
			style={props.style as never}
		>
			{reducedNow() ? BUSY_STILL : busy(tick, seed)}
		</RNText>
	);
}

// Whether the page's busy glyph is the scramble's three glyphs: the theme
// scrambles its text.
export const busyScrambles = (): boolean => loading.text === "scramble";
