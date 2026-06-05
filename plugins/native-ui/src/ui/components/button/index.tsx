import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { Pressable, type PressableProps, Text } from "react-native";
import { cn } from "#lib/cn";

// Persona is encoded by FILL, never hue: `solid` (Skipper) vs `outline` (Ospite)
// share the same accent token — the difference is presence of fill, not colour.
const button = cva("flex-row items-center justify-center gap-2 rounded-md", {
	variants: {
		variant: {
			solid: "bg-accent",
			outline: "border border-edge bg-transparent",
			ghost: "bg-transparent",
		},
		size: {
			sm: "h-9 px-3",
			md: "h-11 px-4",
			lg: "h-12 px-6",
		},
	},
	defaultVariants: { variant: "solid", size: "md" },
});

const buttonLabel = cva("text-base font-medium", {
	variants: {
		variant: {
			solid: "text-accent-ink",
			outline: "text-ink-1",
			ghost: "text-ink-1",
		},
	},
	defaultVariants: { variant: "solid" },
});

export interface ButtonProps
	extends Omit<PressableProps, "children">,
		VariantProps<typeof button> {
	children?: ReactNode;
}

export function Button({
	variant,
	size,
	className,
	children,
	disabled,
	...rest
}: ButtonProps) {
	return (
		<Pressable
			className={cn(
				button({ variant, size }),
				disabled && "opacity-50",
				className,
			)}
			disabled={disabled}
			accessibilityRole="button"
			{...rest}
		>
			{typeof children === "string" ? (
				<Text className={buttonLabel({ variant })}>{children}</Text>
			) : (
				children
			)}
		</Pressable>
	);
}

export { button as buttonVariants };
