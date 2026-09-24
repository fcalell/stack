import { checkbox, text } from "@fcalell/ui-core/variants";
import { Check } from "lucide-react-native";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";

export interface CheckboxProps extends Closed {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}

// A circle that fills with the accent; the label is the rest of the line.
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			accessibilityLabel={label}
			onPress={() => onChange(!checked)}
			className="min-h-11 flex-row items-center gap-stack"
		>
			<View
				className={cn(
					checkbox({ state: checked ? "checked" : "unchecked" }),
					"size-6 items-center justify-center",
				)}
			>
				{checked ? <Glyph icon={Check} tone="on-accent" size={16} /> : null}
			</View>
			<RNText className={cn(text({ role: "body" }), "flex-1")}>{label}</RNText>
		</Pressable>
	);
}
