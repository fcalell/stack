import { field } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "#lib/cn";

// `state` has no prop to bind to here, so the two reachable states are written
// as variant prefixes over the same cells the matrix holds.
const SHELL =
	"w-full min-w-0 font-mono text-callout text-ink-1 outline-none transition-colors placeholder:text-ink-4 focus-visible:border-ink-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive aria-invalid:border-danger file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-ink-1";

const MUTED = "bg-surface-3 text-ink-4 cursor-not-allowed";

type InputProps = ComponentProps<"input">;

function Input(props: InputProps) {
	const merged = mergeProps({ type: "text" as const }, props);
	const [local, rest] = splitProps(merged, ["class", "type"]);
	return (
		<input
			type={local.type}
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

export type { InputProps };
export { Input };
