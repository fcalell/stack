import { rhythm } from "@fcalell/ui-core/variants";
import { createSignal, type JSX } from "solid-js";
import { BarContext } from "#lib/bar.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { TouchedContext } from "#lib/touched.ts";

// Fields at `stack`; its `ActionBar` last and in flow, so it scrolls with the
// fields and the keyboard never covers it. A blocked act inside says its
// reason once a field has taken input.
export type FormProps = Closed & {
	onSubmit: () => void;
	children?: JSX.Element;
};

export function Form(props: FormProps) {
	const [touched, setTouched] = createSignal(false);
	return (
		<BarContext.Provider value="flow">
			<TouchedContext.Provider value={touched}>
				<form
					class={cn(rhythm({ unit: "stack" }), "flex flex-col")}
					onInput={() => setTouched(true)}
					onSubmit={(event) => {
						event.preventDefault();
						props.onSubmit();
					}}
				>
					{props.children}
				</form>
			</TouchedContext.Provider>
		</BarContext.Provider>
	);
}
