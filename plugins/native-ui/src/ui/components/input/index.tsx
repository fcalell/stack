import { cva, type VariantProps } from "class-variance-authority";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "#lib/cn";

const input = cva(
	"h-11 rounded-md border bg-canvas px-3 text-base text-ink-1",
	{
		variants: {
			variant: {
				default: "border-edge",
				error: "border-danger",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export interface InputProps
	extends TextInputProps,
		VariantProps<typeof input> {}

export function Input({ variant, className, ...rest }: InputProps) {
	return (
		<TextInput
			className={cn(input({ variant }), className)}
			placeholderTextColorClassName="text-ink-2"
			{...rest}
		/>
	);
}
