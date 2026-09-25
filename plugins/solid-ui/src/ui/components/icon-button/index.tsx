import { Dynamic } from "solid-js/web";
import { circle, glyph } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { useFit } from "#lib/fit.ts";
import { useIcon } from "#lib/icons.tsx";

// A circle with the consumer's glyph, for moving and nothing else: 44 px in
// the body, compact in a top bar with its 44 px hit area kept. The label is
// read aloud, never drawn.
export type IconButtonProps = Closed & {
	icon: string;
	label: string;
	onAct?: () => void;
};

export function IconButton(props: IconButtonProps) {
	const fit = useFit();
	return (
		<button
			type="button"
			aria-label={props.label}
			class={circle(fit)}
			onClick={() => props.onAct?.()}
		>
			<Dynamic
				component={useIcon(props.icon)}
				class={glyph(fit)}
				aria-hidden="true"
			/>
		</button>
	);
}
