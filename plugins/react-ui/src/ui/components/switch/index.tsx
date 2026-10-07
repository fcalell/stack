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
	"inline-flex shrink-0 items-center justify-start group-not-data-disabled/toggle:group-hover/toggle:bg-switch-off-hover group-not-data-disabled/toggle:group-active/toggle:bg-switch-off-hover group-data-disabled/toggle:bg-fill-disabled";
const ON =
	"inline-flex shrink-0 items-center justify-start group-not-data-disabled/toggle:group-hover/toggle:bg-toggle-on-hover group-not-data-disabled/toggle:group-active/toggle:bg-toggle-on-hover group-data-disabled/toggle:bg-fill-disabled";
const THUMB =
	"transition-transform duration-fast ease-in-out data-disabled:bg-ink-disabled";

/** A setting that takes effect at once, on or off. */
export interface SwitchProps extends Closed {
	/** Whether it is on. */
	checked: boolean;
	/** Hears the next value when the viewer flips it. */
	onChange: (checked: boolean) => void;
	/** Its name; the row around it draws the visible label. */
	label: string;
}

/** A track and its thumb, drawn alone inside a target-sized hit box. */
export function Switch({ checked, onChange, label }: SwitchProps) {
	const state = checked ? "on" : "off";
	// A field around it disables it through Base UI's field context, which
	// sets `disabled` and `data-disabled` on the hit box and the thumb.
	// The hit box is a native button: on a span, Base UI reads the hidden
	// input's `labels` after every render, a walk of the whole document.
	return (
		<Base.Root
			nativeButton
			render={<button type="button" />}
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
