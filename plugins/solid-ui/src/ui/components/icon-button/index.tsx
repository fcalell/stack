import { Dynamic } from "solid-js/web";
import { CIRCLE, GLYPH } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { useIcon } from "#lib/icons.tsx";

// A 44 px circle with the consumer's glyph, for moving and nothing else. The
// label is read aloud, never drawn.
export type IconButtonProps = Closed & {
	icon: string;
	label: string;
	onAct?: () => void;
};

export function IconButton(props: IconButtonProps) {
	return (
		<button
			type="button"
			aria-label={props.label}
			class={CIRCLE}
			onClick={() => props.onAct?.()}
		>
			<Dynamic
				component={useIcon(props.icon)}
				class={GLYPH}
				aria-hidden="true"
			/>
		</button>
	);
}
