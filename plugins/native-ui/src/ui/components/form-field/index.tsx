import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface FormFieldProps extends Closed {
	label: string;
	description?: string;
	error?: string;
	children?: ReactNode;
}

// A typing control with its label, its description and its error, stacked.
export function FormField({
	label,
	description,
	error,
	children,
}: FormFieldProps) {
	return (
		<View className="gap-pair" accessibilityLabel={label}>
			<RNText className={text({ role: "label" })}>{label}</RNText>
			{children}
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{error ? (
				<RNText
					accessibilityLiveRegion="polite"
					className={cn(text({ role: "meta" }), "text-danger")}
				>
					{error}
				</RNText>
			) : null}
		</View>
	);
}
