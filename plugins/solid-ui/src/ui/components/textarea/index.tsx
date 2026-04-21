import { cva } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";

const textareaClasses = cva(
	"flex min-h-16 max-h-64 w-full min-w-0 resize-none overflow-y-auto rounded-md border-2 border-input bg-muted font-mono text-sm text-foreground field-sizing-content outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-destructive aria-invalid:outline-offset-2 disabled:cursor-not-allowed disabled:bg-card disabled:opacity-50",
	{
		variants: {
			size: {
				sm: "px-3 py-1 text-sm",
				default: "px-4 py-2 text-sm",
				lg: "px-4 py-3 text-base",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type TextareaProps = {
	size?: "sm" | "default" | "lg";
} & Omit<ComponentProps<"textarea">, "size">;

function Textarea(props: TextareaProps) {
	const merged = mergeProps(
		{ rows: 3 as const, size: "default" as const },
		props,
	);
	const [local, rest] = splitProps(merged, ["class", "size"]);
	return (
		<textarea
			class={cn(textareaClasses({ size: local.size }), local.class)}
			{...rest}
		/>
	);
}

export type { TextareaProps };
export { Textarea, textareaClasses };
