import type { ButtonFit } from "@fcalell/ui-core/variants";
import { ICON_BUTTON, ICON_BUTTON_BAR } from "@fcalell/ui-core/variants";
import type { LucideIcon } from "lucide-solid";
import { Dynamic } from "solid-js/web";
import { cn } from "#lib/cn.ts";
import { BAR_HIT, useFit } from "#lib/fit.ts";

// The circle behind every icon-only act the plugin draws itself: back,
// close, more, the row's more. `IconButton` is the same circle with the
// consumer's glyph. The label is read aloud, never drawn. 44 px in the body;
// in a top bar it draws compact and keeps the 44 px hit area.
const CIRCLE_SHELL =
	"inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors duration-(--duration-fast) ease-ui hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint disabled:cursor-not-allowed";

export const circle = (fit: ButtonFit) =>
	fit === "bar"
		? cn(ICON_BUTTON_BAR, CIRCLE_SHELL, "size-8", BAR_HIT)
		: cn(ICON_BUTTON, CIRCLE_SHELL, "size-11");

export const glyph = (fit: ButtonFit) =>
	fit === "bar" ? "size-4 shrink-0" : "size-5 shrink-0";

export function Circle(props: {
	glyph: LucideIcon;
	label: string;
	onAct?: () => void;
	disabled?: boolean;
}) {
	const fit = useFit();
	return (
		<button
			type="button"
			aria-label={props.label}
			disabled={props.disabled}
			class={circle(fit)}
			onClick={() => props.onAct?.()}
		>
			<Dynamic component={props.glyph} class={glyph(fit)} aria-hidden="true" />
		</button>
	);
}
