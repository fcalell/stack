import { field } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "solid-js";
import { mergeProps } from "solid-js";
import { cn } from "#lib/cn";
import { fieldMutedClass, fieldShellClass } from "#lib/field";
import { groupControlClass, useInInputGroup } from "#lib/input-group";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const BOX =
	"flex min-h-16 max-h-64 w-full min-w-0 resize-none overflow-y-auto py-2 field-sizing-content";

type TextareaProps = ComponentProps<"textarea"> & {
	class?: never;
	style?: never;
	classList?: never;
};

function Textarea(props: TextareaProps) {
	const merged = mergeProps({ rows: 3 as const }, props);
	const inGroup = useInInputGroup();
	return (
		<textarea
			class={cn(
				field({ state: "default", layout: "input" }),
				fieldShellClass,
				BOX,
				merged.disabled && fieldMutedClass,
				inGroup && groupControlClass,
			)}
			{...merged}
		/>
	);
}

export type { TextareaProps };
export { Textarea };
