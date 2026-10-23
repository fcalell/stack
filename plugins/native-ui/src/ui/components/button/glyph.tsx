import type { IconName } from "@fcalell/ui-core/descriptors";
import { timings } from "@fcalell/ui-core/paint";
import { type IconButtonFit, iconButton } from "@fcalell/ui-core/variants";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, PAINT_CONTROL, useShown } from "../../lib/paint";
import { Press } from "../../lib/press";
import { Swap } from "../../lib/swap";
import { Turn } from "../../lib/turn";
import { Icon } from "../icon";
import { Spinner } from "../spinner";

const BOX = "items-center justify-center";
// The press wash, drawn as an overlay that fades out on release (`Press`).
const WASH = "rounded-control bg-wash-press";
// A trigger whose sheet is open holds the press wash.
const OPEN = "bg-wash-press";

// The square behind every icon-only act: the consumer's icon Button and
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
	// Absent on an act that is never pressed (painted, or disabled).
	onAct?: () => void;
	fit?: IconButtonFit;
	disabled?: boolean;
	// The act is running: inert, its glyph swapped for the spinner, the rest ink kept.
	pending?: boolean;
	open?: boolean;
	// The act folds a branch: its state is the accessibility state, the open wash (`open`)
	// is not drawn for it, and its glyph is the chevron down turned a quarter while it is closed.
	expanded?: boolean;
	painted?: boolean;
}) {
	const drawn = useShown(pending, timings.actDelay);
	return (
		<Press
			painted={painted}
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
			wash={painted || disabled || pending ? undefined : WASH}
			give={!(painted || disabled || pending)}
			className={cn(
				iconButton({ fit }),
				BOX,
				painted && PAINT_CONTROL,
				!painted && open && OPEN,
			)}
		>
			{({ pressed }) => (
				<Ink.Provider value={toneOf(pressed || open === true, disabled)}>
					{painted ? null : drawn ? (
						<Spinner />
					) : expanded === undefined ? (
						// A glyph swapped while shown (a copy act's check) is a mark change.
						<Swap id={icon} scale>
							<Icon name={icon} fit="control" />
						</Swap>
					) : (
						<Turn
							name="ChevronDown"
							fit="control"
							turned={!expanded}
							by="quarter"
						/>
					)}
				</Ink.Provider>
			)}
		</Press>
	);
}

function toneOf(pressed: boolean, disabled: boolean | undefined) {
	if (disabled) return "ink-disabled";
	return pressed ? "ink-body" : "ink-meta";
}
