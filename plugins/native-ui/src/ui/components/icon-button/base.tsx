import type { IconName } from "@fcalell/ui-core/descriptors";
import { type IconButtonFit, iconButton } from "@fcalell/ui-core/variants";
import { Pressable } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Icon } from "../icon";

const BOX = "items-center justify-center";
const PRESS = "active:bg-wash-press";
// A trigger whose sheet is open holds the press wash.
const OPEN = "bg-wash-press";

// The square behind every icon-only act: the consumer's IconButton and
// stack's own back, close, more, send and stop acts. No boundary at rest, the
// press wash its ground (an open trigger's too); the glyph is in the meta
// ink, the body ink under the press and while open, and the disabled ink in a
// disabled place, which takes no wash.
// Outside the package's exports.
export function IconButtonBase({
	icon,
	label,
	onAct,
	fit,
	disabled,
	open,
}: {
	icon: IconName;
	label: string;
	onAct: () => void;
	fit?: IconButtonFit;
	disabled?: boolean;
	open?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled, expanded: open }}
			disabled={disabled}
			onPress={onAct}
			className={cn(iconButton({ fit }), BOX, !disabled && PRESS, open && OPEN)}
		>
			{({ pressed }) => (
				<Ink.Provider value={toneOf(pressed || open === true, disabled)}>
					<Icon name={icon} fit="control" />
				</Ink.Provider>
			)}
		</Pressable>
	);
}

function toneOf(pressed: boolean, disabled: boolean | undefined) {
	if (disabled) return "ink-disabled";
	return pressed ? "ink-body" : "ink-meta";
}
