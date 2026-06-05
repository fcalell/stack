import { cva, type VariantProps } from "class-variance-authority";
import { View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

const card = cva("rounded-lg p-4", {
	variants: {
		variant: {
			ring: "border border-edge bg-canvas",
			flat: "bg-surface",
		},
	},
	defaultVariants: { variant: "ring" },
});

export interface CardProps extends ViewProps, VariantProps<typeof card> {}

export function Card({ variant, className, ...rest }: CardProps) {
	return <View className={cn(card({ variant }), className)} {...rest} />;
}
