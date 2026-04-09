import { cva } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";

const inputClasses = cva(
	"w-full min-w-0 rounded-md border-2 border-input bg-muted font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-destructive aria-invalid:outline-offset-2 disabled:cursor-not-allowed disabled:bg-card disabled:opacity-50 file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground",
	{
		variants: {
			size: {
				sm: "h-8 px-3 py-1 text-sm file:h-6 file:text-sm",
				default: "h-10 px-4 py-2 text-sm file:h-7 file:text-sm",
				lg: "h-12 px-4 py-3 text-base file:h-8 file:text-base",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type InputProps = {
	size?: "sm" | "default" | "lg";
} & Omit<ComponentProps<"input">, "size">;

function Input(props: InputProps) {
	const merged = mergeProps(
		{ type: "text" as const, size: "default" as const },
		props,
	);
	const [local, rest] = splitProps(merged, ["class", "type", "size"]);
	return (
		<input
			type={local.type}
			class={cn(inputClasses({ size: local.size }), local.class)}
			{...rest}
		/>
	);
}

export type { InputProps };
export { Input, inputClasses };
