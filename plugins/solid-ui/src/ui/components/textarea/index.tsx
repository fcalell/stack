import { field } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { fieldMutedClass, fieldShellClass } from "#lib/field";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const BOX =
	"flex min-h-16 max-h-64 w-full min-w-0 resize-none overflow-y-auto py-2 field-sizing-content";

type TextareaProps = ComponentProps<"textarea">;

function Textarea(props: TextareaProps) {
	const merged = mergeProps({ rows: 3 as const }, props);
	const [local, rest] = splitProps(merged, ["class"]);
	return (
		<textarea
			class={cn(
				field({ state: "default", layout: "input" }),
				fieldShellClass,
				BOX,
				merged.disabled && fieldMutedClass,
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { TextareaProps };
export { Textarea };
