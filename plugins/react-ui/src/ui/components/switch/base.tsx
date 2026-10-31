import { Switch as Base } from "@base-ui/react/switch";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import { useHeldDraft } from "../../lib/act.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { SwitchProps } from "./index.tsx";

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
const THUMB = "data-disabled:bg-ink-disabled";

/** The track and thumb every Switch renders, on the `draft` its host holds: a field hosts the draft of its switch and draws a rejection in its own line. `painted` is the track while its data is not here: filled, the thumb not drawn, inert. `disabled` (a row's lock) takes the control out of use for everyone: the disabled attribute, the disabled fill and ink, no press. A read that ended leaves the track unfilled with no thumb, blocked: a press says why and changes nothing. Outside the package's exports. */
export function SwitchBase({
	draft,
	onChange,
	label,
	painted: given,
	disabled,
}: Omit<SwitchProps, "checked"> & {
	draft: Draft<boolean>;
	painted?: boolean;
	disabled?: boolean;
}) {
	// A read that ended leaves the track standing with no thumb, blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const absent = painted || ended;
	const on = draft.value && !absent;
	const state = on ? "on" : "off";
	// A field around it disables it through Base UI's field context, which
	// sets `disabled` and `data-disabled` on the hit box and the thumb.
	// The hit box is a native button: on a span, Base UI reads the hidden
	// input's `labels` after every render, a walk of the whole document.
	return (
		<Base.Root
			nativeButton
			render={<button type="button" />}
			checked={on}
			onCheckedChange={(next) => {
				draft.change(next, () => onChange(next));
			}}
			aria-label={label}
			inert={painted || undefined}
			disabled={disabled}
			aria-disabled={ended || undefined}
			className={HIT}
		>
			<span
				className={cn(
					switchTrack({ state }),
					on ? ON : OFF,
					RING,
					painted && PAINT_CONTROL,
				)}
			>
				<Base.Thumb
					className={cn(switchThumb({ state }), THUMB, absent && "invisible")}
				/>
			</span>
		</Base.Root>
	);
}

/** A Switch that holds its own draft, as a bare one and a row's toggle do; a rejection toasts. Outside the package's exports. */
export function HeldSwitch({
	checked,
	onChange,
	label,
	painted,
	disabled,
}: SwitchProps & { painted?: boolean; disabled?: boolean }) {
	return (
		<SwitchBase
			draft={useHeldDraft(checked)}
			onChange={onChange}
			label={label}
			painted={painted}
			disabled={disabled}
		/>
	);
}
