import { createEffect, createSignal, onCleanup } from "solid-js";
import { cn } from "#lib/cn";

const CHARS = "0123456789abcdef.:/-_#";
const TICK_MS = 50;
const TICKS_PER_RESOLVE = 2;
const PAUSE_MS = 1500;

function scramble(text: string, resolved: number): string {
	const chars = text.split("");
	for (let i = resolved; i < chars.length; i++) {
		if (chars[i] === " ") continue;
		chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)] ?? "#";
	}
	return chars.join("");
}

type LoaderProps = {
	text: string;
	class?: string;
};

function Loader(props: LoaderProps) {
	const [display, setDisplay] = createSignal(scramble(props.text, 0));

	createEffect(() => {
		const text = props.text;
		let resolved = 0;
		let tick = 0;
		let paused = false;
		let pauseTimer: ReturnType<typeof setTimeout> | undefined;

		const interval = setInterval(() => {
			if (paused) return;

			tick++;
			if (tick % TICKS_PER_RESOLVE === 0 && resolved < text.length) {
				while (resolved < text.length && text[resolved] === " ") resolved++;
				resolved++;
			}

			if (resolved >= text.length) {
				setDisplay(text);
				paused = true;
				pauseTimer = setTimeout(() => {
					resolved = 0;
					tick = 0;
					paused = false;
				}, PAUSE_MS);
				return;
			}

			setDisplay(scramble(text, resolved));
		}, TICK_MS);

		onCleanup(() => {
			clearInterval(interval);
			if (pauseTimer) clearTimeout(pauseTimer);
		});
	});

	return (
		<span
			role="status"
			aria-label={props.text}
			class={cn("font-mono text-xs text-muted-foreground", props.class)}
		>
			{display()}
		</span>
	);
}

export type { LoaderProps };
export { Loader };
