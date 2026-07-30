import { field } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { fieldMutedClass, fieldShellClass } from "#lib/field";

const FILE =
	"file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-ink-1";

type InputProps = ComponentProps<"input">;

function Input(props: InputProps) {
	const merged = mergeProps({ type: "text" as const }, props);
	const [local, rest] = splitProps(merged, ["class", "type"]);
	return (
		<input
			type={local.type}
			class={cn(
				field({ state: "default", layout: "input" }),
				fieldShellClass,
				"w-full min-w-0",
				FILE,
				merged.disabled && fieldMutedClass,
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { InputProps };
export { Input };
