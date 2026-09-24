import { ICON_BUTTON } from "@fcalell/ui-core/variants";
import type { LucideIcon } from "lucide-solid";
import { Dynamic } from "solid-js/web";
import { cn } from "#lib/cn";

// The 44 px circle behind every icon-only act the plugin draws itself: back,
// close, more, the row's more. `IconButton` is the same circle with the
// consumer's glyph. The label is read aloud, never drawn.
export const CIRCLE = cn(
	ICON_BUTTON,
	"inline-flex size-11 shrink-0 cursor-pointer items-center justify-center transition-colors duration-(--duration-fast) ease-ui hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint disabled:cursor-not-allowed",
);

export const GLYPH = "size-5 shrink-0";

export function Circle(props: {
	glyph: LucideIcon;
	label: string;
	onAct?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			aria-label={props.label}
			disabled={props.disabled}
			class={CIRCLE}
			onClick={() => props.onAct?.()}
		>
			<Dynamic component={props.glyph} class={GLYPH} aria-hidden="true" />
		</button>
	);
}
