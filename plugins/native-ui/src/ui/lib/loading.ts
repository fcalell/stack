import { waitStep } from "@fcalell/ui-core/wait";
import { createContext, useEffect, useRef, useState } from "react";
import { settle } from "./settle";

// Set by a loading `Section` or `Group` around its body: each part in it that
// has a waiting form (a `List`, a `Prose`, a `Meter`, a `Slider`, a
// `DefinitionRow`, a `Code`, a `Thread`) draws it, a List's in the slots its
// `row` declares.
export const LoadingContext = createContext(false);

// A waiting form shows only for a read that lasts (`@fcalell/ui-core/wait`:
// drawn after `WAIT_DELAY`, kept `WAIT_MIN` once drawn). During the delay it
// stands in its place, undrawn, so the screen does not move when it lands.
export const VEIL = "opacity-0";

// The waiting state of a read: `waiting` is what to draw as waiting (a read
// that settled inside the minimum still holds its form), `veiled` that the
// form stands undrawn while the delay runs. The switch to the loaded form is
// the settle (`./settle.ts`): a state of its own, flipped after the read,
// with every other switch of that frame under one layout animation.
export function useWait(waiting: boolean): {
	waiting: boolean;
	veiled: boolean;
} {
	// The waiting form (drawn or veiled) holds the place; it stays set after the
	// read settles until the flip.
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
			Date.now(),
		);
		if (step.kind === "delay") {
			const timer = setTimeout(() => {
				since.current = Date.now();
				setDrawn(true);
			}, step.after);
			return () => clearTimeout(timer);
		}
		if (!standing || step.kind === "drawn") return undefined;
		const flip = () => {
			setStanding(false);
			setDrawn(false);
		};
		let live = true;
		const run = () => {
			settle(() => {
				if (live) flip();
			});
		};
		if (step.kind !== "hold") {
			run();
			return () => {
				live = false;
			};
		}
		const timer = setTimeout(run, step.after);
		return () => {
			clearTimeout(timer);
			live = false;
		};
	}, [waiting, standing, drawn]);
	const on = waiting || standing;
	return { waiting: on, veiled: on && !drawn };
}
