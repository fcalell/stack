import { cva, type VariantProps } from "class-variance-authority";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "#lib/cn";

// Multiline sibling of Input — same ring grammar, top-aligned text, taller min
// height. `.err` swaps the edge ring for danger; pair with flabel / field-err.
const textArea = cva(
	"min-h-20 rounded-md border bg-canvas px-3 py-2 text-base text-ink-1",
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

export interface TextAreaProps
	extends TextInputProps,
		VariantProps<typeof textArea> {}

export function TextArea({ variant, className, ...rest }: TextAreaProps) {
	return (
		<TextInput
			multiline
			textAlignVertical="top"
			className={cn(textArea({ variant }), className)}
			placeholderTextColorClassName="text-ink-2"
			{...rest}
		/>
	);
}
