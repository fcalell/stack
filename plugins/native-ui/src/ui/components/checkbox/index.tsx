import {
	CHECKBOX_MARK,
	CONTROL_MUTED,
	checkbox,
} from "@fcalell/ui-core/variants";
import { Pressable, Text } from "react-native";
import { cn } from "../../lib/cn";

export interface CheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: never;
	style?: never;
}

// Checklist box (Cambusa shopping/menu) on the shared CHECKBOX cells: checked
// is the accent fill with the CHECKBOX_MARK tick (the contract's guaranteed
// contrast pair), unchecked the ink-1 ring. For true check-in-place lists
// only; a navigational task row is a RowItem with a chevron, not this.
export function Checkbox({ checked, onChange, disabled }: CheckboxProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			className={cn(
				checkbox({ state: checked ? "checked" : "unchecked" }),
				"h-[22px] w-[22px] items-center justify-center",
				disabled && CONTROL_MUTED,
			)}
		>
			{checked ? (
				<Text className={cn("text-micro", CHECKBOX_MARK)}>✓</Text>
			) : null}
		</Pressable>
	);
}
