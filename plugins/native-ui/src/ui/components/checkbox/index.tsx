import { Pressable, Text } from "react-native";
import { cn } from "../../lib/cn";

export interface CheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: never;
	style?: never;
}

// Round checklist box (Cambusa shopping/menu). Checked = accent fill with the
// `accent-ink` tick (the contract's guaranteed contrast pair, and web's);
// unchecked = hairline edge ring. For true check-in-place lists only — a
// navigational task row is a RowItem with a chevron, not this.
export function Checkbox({ checked, onChange, disabled }: CheckboxProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			className={cn(
				"h-[22px] w-[22px] items-center justify-center rounded-full",
				checked ? "bg-accent" : "border-[1.5px] border-edge",
				disabled && "opacity-40",
			)}
		>
			{checked ? (
				<Text className="text-micro text-accent-ink">✓</Text>
			) : null}
		</Pressable>
	);
}
