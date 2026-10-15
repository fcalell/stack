import { type ReactNode, useEffect, useRef } from "react";

/** An act that never settles: pressed, it pends for as long as the frame stands. */
export const hang = () => new Promise<never>(() => {});

/** Presses the acts it draws once mounted (the ones named `label`, else every button), so a pending frame holds the pending look a real press would. Draws no box of its own. */
export function Pressed(props: { label?: string; children: ReactNode }) {
	const root = useRef<HTMLDivElement>(null);
	const { label } = props;
	useEffect(() => {
		for (const button of root.current?.querySelectorAll("button") ?? []) {
			if (
				label === undefined ||
				button.textContent === label ||
				button.getAttribute("aria-label") === label
			)
				button.click();
		}
	}, [label]);
	return (
		<div ref={root} className="contents">
			{props.children}
		</div>
	);
}
