import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

// Like Button, persona reads through FILL: `solid` vs `outline` share the accent
// token. Use for status / role / count chips.
const pill = cva("self-start rounded-full px-3 py-1", {
	variants: {
		variant: {
			solid: "bg-accent",
			outline: "border border-edge bg-transparent",
		},
	},
	defaultVariants: { variant: "outline" },
});

const pillLabel = cva("text-xs font-medium", {
	variants: {
		variant: {
			solid: "text-accent-ink",
			outline: "text-ink-1",
		},
	},
	defaultVariants: { variant: "outline" },
});

export interface PillProps
	extends Omit<ViewProps, "children">,
		VariantProps<typeof pill> {
	children?: ReactNode;
}

export function Pill({ variant, className, children, ...rest }: PillProps) {
	return (
		<View className={cn(pill({ variant }), className)} {...rest}>
			{typeof children === "string" ? (
				<Text className={pillLabel({ variant })}>{children}</Text>
			) : (
				children
			)}
		</View>
	);
}
