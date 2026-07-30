import { field } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const SHELL =
	"flex min-h-16 max-h-64 w-full min-w-0 resize-none overflow-y-auto py-2 font-mono text-callout text-ink-1 field-sizing-content outline-none transition-colors placeholder:text-ink-4 focus-visible:border-ink-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive aria-invalid:border-danger";

const MUTED = "bg-surface-3 text-ink-4 cursor-not-allowed";

type TextareaProps = ComponentProps<"textarea">;

function Textarea(props: TextareaProps) {
	const merged = mergeProps({ rows: 3 as const }, props);
	const [local, rest] = splitProps(merged, ["class"]);
	return (
		<textarea
			class={cn(
				field({ state: "default", layout: "input" }),
				SHELL,
				merged.disabled && MUTED,
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { TextareaProps };
export { Textarea };
