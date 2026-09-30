import {
	type IconButtonFit,
	icon,
	iconButton,
} from "@fcalell/ui-core/variants";
import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";
import { useResolveClassNames } from "uniwind";
import { cn } from "./cn";
import { Glyph } from "./glyph";

const BOX = "items-center justify-center";
const PRESS = "active:bg-wash-press";

// The square behind every icon-only act: the consumer's IconButton and
// stack's own back, close, more, send and stop acts. No boundary at rest, the
// press wash its ground; the glyph is in the meta ink, the body ink under the
// press, and the disabled ink in a disabled place, which takes no wash.
export function Circle({
	icon: glyph,
	label,
	onAct,
	fit,
	disabled,
}: {
	icon: LucideIcon;
	label: string;
	onAct: () => void;
	fit?: IconButtonFit;
	disabled?: boolean;
}) {
	const { width } = useResolveClassNames(icon({ fit: "control" }));
	const size = typeof width === "number" ? width : undefined;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onAct}
			className={cn(iconButton({ fit }), BOX, !disabled && PRESS)}
		>
			{({ pressed }) => (
				<Glyph icon={glyph} tone={toneOf(pressed, disabled)} size={size} />
			)}
		</Pressable>
	);
}

function toneOf(pressed: boolean, disabled: boolean | undefined) {
	if (disabled) return "ink-disabled";
	return pressed ? "ink-body" : "ink-meta";
}
