import { waitStep } from "@fcalell/ui-core/wait";
import { createContext, useEffect, useRef, useState } from "react";

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
// form stands undrawn while the delay runs.
export function useWait(waiting: boolean): {
	waiting: boolean;
	veiled: boolean;
} {
	const [drawn, setDrawn] = useState(false);
	const [held, setHeld] = useState(false);
	const since = useRef(0);
	useEffect(() => {
		const step = waitStep(
			waiting,
			drawn ? since.current : undefined,
			Date.now(),
		);
		if (step.kind === "drawn") setHeld(false);
		if (step.kind === "gone") setDrawn(false);
		if (step.kind === "delay") {
			const timer = setTimeout(() => {
				since.current = Date.now();
				setDrawn(true);
			}, step.after);
			return () => clearTimeout(timer);
		}
		if (step.kind === "hold") {
			setHeld(true);
			const timer = setTimeout(() => {
				setHeld(false);
				setDrawn(false);
			}, step.after);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [waiting, drawn]);
	return { waiting: waiting || held, veiled: waiting && !drawn };
}
