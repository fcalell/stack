import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { cn } from "#lib/cn";

export interface CheckboxProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	// Override the default tick (e.g. a lucide <Check/>). Rendered only when checked.
	icon?: ReactNode;
	className?: string;
}

// Round checklist box (Cambusa shopping/menu). Checked = ok fill + white tick;
// unchecked = hairline edge ring. For true check-in-place lists only — a
// navigational task row is a RowItem with a chevron, not this.
export function Checkbox({
	checked,
	onCheckedChange,
	disabled,
	icon,
	className,
}: CheckboxProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onCheckedChange(!checked)}
			className={cn(
				"h-[22px] w-[22px] items-center justify-center rounded-full",
				checked ? "bg-ok" : "border-[1.5px] border-edge",
				disabled && "opacity-40",
				className,
			)}
		>
			{checked ? (icon ?? <Text className="text-xs text-white">✓</Text>) : null}
		</Pressable>
	);
}
