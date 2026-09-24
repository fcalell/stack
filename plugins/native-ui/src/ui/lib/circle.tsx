import { ICON_BUTTON } from "@fcalell/ui-core/variants";
import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";
import { cn } from "./cn";
import { Glyph } from "./glyph";

// The 44 px circle behind every icon-only act: the consumer's IconButton and
// stack's own back, close, more, send and stop circles.
export function Circle({
	icon,
	label,
	onAct,
	disabled,
}: {
	icon: LucideIcon;
	label: string;
	onAct: () => void;
	disabled?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onAct}
			className={cn(
				ICON_BUTTON,
				"items-center justify-center active:bg-edge",
				disabled && "opacity-50",
			)}
		>
			<Glyph icon={icon} />
		</Pressable>
	);
}
