import type { IconName } from "@fcalell/ui-core/descriptors";
import { timings } from "@fcalell/ui-core/paint";
import { type IconButtonFit, iconButton } from "@fcalell/ui-core/variants";
import { Pressable } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { Icon } from "../icon";
import { Spinner } from "../spinner";

const BOX = "items-center justify-center";
const PRESS = "active:bg-wash-press";
// A trigger whose sheet is open holds the press wash.
const OPEN = "bg-wash-press";

// The square behind every icon-only act: the consumer's IconButton and
// stack's own back, close, more, send and stop acts. No boundary at rest, the
// press wash its ground (an open trigger's too); the glyph is in the meta
// ink, the body ink under the press and while open, and the disabled ink in a
// disabled place, which takes no wash. `pending` is the act running: inert at
// once, its glyph swapped for the spinner after `ACT_DELAY`. `painted` is the
// act while its data is not here: its box filled, no glyph, inert.
// Outside the package's exports.
export function IconButtonBase({
	icon,
	label,
	onAct,
	fit,
	disabled,
	pending,
	open,
	expanded,
	painted,
}: {
	icon: IconName;
	label: string;
	onAct: () => void;
	fit?: IconButtonFit;
	disabled?: boolean;
	// The act is running: inert, its glyph swapped for the spinner, the rest ink kept.
	pending?: boolean;
	open?: boolean;
	// The act folds a branch: its state is the accessibility state, and the open wash (`open`)
	// is not drawn for it.
	expanded?: boolean;
	painted?: boolean;
}) {
	const shown = useShown(painted);
	const drawn = useShown(pending, timings.actDelay);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{
				disabled: disabled || pending,
				busy: pending,
				expanded: expanded ?? open,
			}}
			disabled={disabled || pending}
			onPress={onAct}
			{...inertProps(painted === true)}
			className={cn(
				iconButton({ fit }),
				BOX,
				painted ? paintControl(shown) : !disabled && !pending && PRESS,
				!painted && open && OPEN,
			)}
		>
			{({ pressed }) => (
				<Ink.Provider value={toneOf(pressed || open === true, disabled)}>
					{painted ? null : drawn ? (
						<Spinner />
					) : (
						<Icon name={icon} fit="control" />
					)}
				</Ink.Provider>
			)}
		</Pressable>
	);
}

function toneOf(pressed: boolean, disabled: boolean | undefined) {
	if (disabled) return "ink-disabled";
	return pressed ? "ink-body" : "ink-meta";
}
