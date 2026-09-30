import { Switch as Base } from "@base-ui/react/switch";
import { cn } from "@fcalell/ui-core/cn";
import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";

// The switch element is the target-sized hit box, so a press anywhere in it
// toggles; the track inside draws the states and the focus ring.
const HIT =
	"group/toggle inline-flex shrink-0 items-center justify-center min-h-target min-w-target outline-none";
const RING =
	"group-focus-visible/toggle:outline-2 group-focus-visible/toggle:outline-offset-2 group-focus-visible/toggle:outline-ring";
const OFF =
	"inline-flex shrink-0 items-center justify-start group-not-aria-disabled/toggle:group-hover/toggle:bg-switch-off-hover group-not-aria-disabled/toggle:group-active/toggle:bg-switch-off-hover group-aria-disabled/toggle:bg-fill-disabled";
const ON =
	"inline-flex shrink-0 items-center justify-start group-not-aria-disabled/toggle:group-hover/toggle:bg-toggle-on-hover group-not-aria-disabled/toggle:group-active/toggle:bg-toggle-on-hover group-aria-disabled/toggle:bg-fill-disabled";
const THUMB =
	"transition-transform duration-fast ease-in-out data-disabled:bg-ink-disabled";

/** A setting that takes effect at once, on or off. */
export interface SwitchProps extends Closed {
	/** Whether it is on. */
	checked: boolean;
	/** Hears the next value when the viewer flips it. */
	onChange: (checked: boolean) => void;
	/** Its name, read aloud; the row around it draws the visible label. */
	label: string;
}

/** A track and its thumb, drawn alone inside a target-sized hit box. */
export function Switch({ checked, onChange, label }: SwitchProps) {
	const state = checked ? "on" : "off";
	// A field around it disables it through Base UI's field context, which
	// sets `aria-disabled` on the hit box and `data-disabled` on the thumb.
	return (
		<Base.Root
			checked={checked}
			onCheckedChange={(next) => onChange(next)}
			aria-label={label}
			className={HIT}
		>
			<span className={cn(switchTrack({ state }), checked ? ON : OFF, RING)}>
				<Base.Thumb className={cn(switchThumb({ state }), THUMB)} />
			</span>
		</Base.Root>
	);
}
