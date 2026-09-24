import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { BarContext } from "#lib/bar.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// Fields at `stack`; its `ActionBar` last and in flow, so it scrolls with the
// fields and the keyboard never covers it.
export type FormProps = Closed & {
	onSubmit: () => void;
	children?: JSX.Element;
};

export function Form(props: FormProps) {
	return (
		<BarContext.Provider value="flow">
			<form
				class={cn(rhythm({ unit: "stack" }), "flex flex-col")}
				onSubmit={(event) => {
					event.preventDefault();
					props.onSubmit();
				}}
			>
				{props.children}
			</form>
		</BarContext.Provider>
	);
}
