import {
	SCRAMBLE_GLYPHS,
	SCRAMBLE_INTERVAL_MS,
	SCRAMBLE_LENGTH,
	SCRAMBLE_STILL,
	type SpinnerKind,
} from "@fcalell/ui-core/tokens";
import { LoaderCircle } from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { useWords } from "#lib/words.tsx";

// The busy glyph, in the ink around it: `circle` spins, `scramble` cycles
// mono glyphs in place and holds still under reduced motion.
export type SpinnerProps = Closed & { kind?: SpinnerKind };

export function Spinner(props: SpinnerProps) {
	const words = useWords();
	return (
		<Show
			when={props.kind === "scramble"}
			fallback={
				<LoaderCircle
					class="size-[1.25em] shrink-0 animate-spin"
					role="status"
					aria-label={words.loading}
				/>
			}
		>
			<Scramble label={words.loading} />
		</Show>
	);
}

function scrambled(): string {
	let out = "";
	for (let i = 0; i < SCRAMBLE_LENGTH; i++) {
		out += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
	}
	return out;
}

function Scramble(props: { label: string }) {
	const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const [glyphs, setGlyphs] = createSignal(
		still ? SCRAMBLE_STILL : scrambled(),
	);
	onMount(() => {
		if (still) return;
		const timer = setInterval(
			() => setGlyphs(scrambled()),
			SCRAMBLE_INTERVAL_MS,
		);
		onCleanup(() => clearInterval(timer));
	});
	return (
		<span role="status" aria-label={props.label} class="shrink-0 font-mono">
			<span aria-hidden="true">{glyphs()}</span>
		</span>
	);
}
