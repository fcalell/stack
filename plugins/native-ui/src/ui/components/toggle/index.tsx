import { Pressable, View } from "react-native";
import { cn } from "#lib/cn";

export interface ToggleProps {
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
	className?: string;
}

// Binary switch (settings opt-ins, inline "lo prendo io"). The 40×24 visual is
// the affordance; the ≥44px tap target is the row it sits in. The knob is the
// canvas token (never #fff) so it stays visible on the ink-1 track in Notturno.
export function Toggle({
	value,
	onValueChange,
	disabled,
	className,
}: ToggleProps) {
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			onPress={() => onValueChange(!value)}
			className={cn(
				"h-6 w-10 flex-row items-center rounded-full px-[3px]",
				value ? "justify-end bg-ink-1" : "justify-start bg-edge",
				disabled && "opacity-40",
				className,
			)}
		>
			<View className="h-[18px] w-[18px] rounded-full bg-canvas" />
		</Pressable>
	);
}
