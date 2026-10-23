import { type ReactNode, useEffect, useRef } from "react";

/** An act that never settles: pressed, it pends for as long as the frame stands. */
export const hang = () => new Promise<never>(() => {});

/** An act the server refuses: pressed, it rejects, and the host draws the sentence the act gives. */
export const fail = () => Promise.reject(new Error("The server refused."));

/** Presses the acts it draws once mounted (the ones named `label`, else every button), so a pending frame holds the pending look a real press would. Draws no box of its own. */
export function Pressed(props: { label?: string; children: ReactNode }) {
	const root = useRef<HTMLDivElement>(null);
	const { label } = props;
	// A frame later, so a bar a part hands up to its host (a `Table`'s selection bar) is drawn.
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			for (const button of root.current?.querySelectorAll("button") ?? []) {
				if (
					label === undefined ||
					button.textContent === label ||
					button.getAttribute("aria-label") === label
				)
					button.click();
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [label]);
	return (
		<div ref={root} className="contents">
			{props.children}
		</div>
	);
}
