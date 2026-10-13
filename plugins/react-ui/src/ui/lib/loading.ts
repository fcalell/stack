import { waitStep } from "@fcalell/ui-core/wait";
import {
	type CSSProperties,
	createContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import { createSettle } from "./settle.ts";

// Set by a loading `Section` or `Group` around its body: each part in it that
// has a waiting form (a `List`, a `Prose`, a `Meter`, a `Slider`, a
// `DefinitionRow`, a `Code`, a `Thread`) draws it, a List's in the slots its
// `row` declares.
export const LoadingContext = createContext(false);

// A waiting form shows only for a read that lasts (`@fcalell/ui-core/wait`:
// drawn after `WAIT_DELAY`, kept `WAIT_MIN` once drawn). During the delay it
// stands in its place, undrawn: it holds the height the loaded form replaces,
// and a waiting part never shows a half-state.
export const VEIL = "invisible";

// The page's one coordinator: the switches of a frame run together in one view
// transition (`./settle.ts`). A running transition is any the document holds,
// the router's among them.
const settle = createSettle({
	frame: (run) => requestAnimationFrame(() => run()),
	reduced: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
	hidden: () => document.hidden,
	running: () =>
		(document as { activeViewTransition?: unknown }).activeViewTransition !=
			null ||
		document
			.getAnimations()
			.some((one) =>
				(one.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
					"::view-transition",
				),
			),
	start: (update) => {
		if (!document.startViewTransition) return undefined;
		const moving = document.startViewTransition(update);
		moving.ready.catch(() => {});
		return moving;
	},
	flush: (run) => flushSync(run),
});

/**
 * The name a `Section` or `Group` root takes for the settle: unique to the
 * instance, so the browser moves it from its old place to its new on its own.
 */
export function useSettleName(): CSSProperties {
	return { viewTransitionName: `settle-${useId().replace(/[^\w-]/g, "")}` };
}

/**
 * The waiting state of a read: `waiting` is what to draw as waiting (a read
 * that settled inside the minimum still holds its form), `veiled` that the
 * form stands undrawn while the delay runs. The switch to the loaded form is
 * the settle: it lands a frame after the read, with every other switch of
 * that frame, whether the form was drawn or not.
 */
export function useWait(waiting: boolean): {
	waiting: boolean;
	veiled: boolean;
} {
	// The waiting form (drawn or veiled) holds the place; it stays set after
	// the read settles until the settle flips it.
	const [standing, setStanding] = useState(waiting);
	if (waiting && !standing) setStanding(true);
	// The delay has run and the form is drawn; it stays set after the read
	// settles until the minimum has passed, so the form never gives way to the
	// loaded body for a render in between.
	const [drawn, setDrawn] = useState(false);
	const since = useRef(0);
	useEffect(() => {
		const step = waitStep(
			waiting,
			drawn ? since.current : undefined,
			performance.now(),
		);
		if (step.kind === "delay") {
			const timer = setTimeout(() => {
				since.current = performance.now();
				setDrawn(true);
			}, step.after);
			return () => clearTimeout(timer);
		}
		if (!standing || step.kind === "drawn") return undefined;
		const flip = () => {
			setStanding(false);
			setDrawn(false);
		};
		if (step.kind !== "hold") return settle.request(flip);
		let withdraw: (() => void) | undefined;
		const timer = setTimeout(() => {
			withdraw = settle.request(flip);
		}, step.after);
		return () => {
			clearTimeout(timer);
			withdraw?.();
		};
	}, [waiting, standing, drawn]);
	const on = waiting || standing;
	return { waiting: on, veiled: on && !drawn };
}
