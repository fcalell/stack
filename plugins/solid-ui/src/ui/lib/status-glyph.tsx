import type { StatusState } from "@fcalell/ui-core/tokens";
import { status } from "@fcalell/ui-core/variants";
import {
	Check,
	CircleAlert,
	CircleDashed,
	Clock,
	type LucideIcon,
	Minus,
	X,
} from "lucide-solid";
import { Dynamic } from "solid-js/web";
import { cn } from "#lib/cn.ts";

// The glyph of each of the six states, the plugin's own since the state is
// the contract's. The word beside it is `words[state]` or the label.
export const STATUS_GLYPH: Record<StatusState, LucideIcon> = {
	active: CircleDashed,
	waiting: Clock,
	done: Check,
	attention: CircleAlert,
	failed: X,
	idle: Minus,
};

export function StatusGlyph(props: { state: StatusState }) {
	return (
		<Dynamic
			component={STATUS_GLYPH[props.state]}
			class={cn(status({ state: props.state }), "size-[1.25em] shrink-0")}
			aria-hidden="true"
		/>
	);
}
