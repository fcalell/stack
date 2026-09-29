import type { Act } from "@fcalell/ui-core/descriptors";
import { TOAST, type ToastState, toastState } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING } from "#lib/interact.ts";
import { StatusGlyph } from "#lib/status-glyph.tsx";
import { toast } from "#lib/toast.ts";

// The dark pill above the bar; client-owned, so never an undo. With `state`
// it reports how an act ended: the state's glyph on its soft fill. `toast()`
// queues one and the `Shell` draws the queue.
export type ToastProps = Closed & {
	sentence: string;
	state?: ToastState;
	act?: Act;
};

export function Toast(props: ToastProps) {
	return (
		<output
			class={cn(
				TOAST,
				props.state && toastState({ state: props.state }),
				"flex items-center shadow-float",
			)}
		>
			<Show when={props.state}>
				{(state) => <StatusGlyph state={state()} />}
			</Show>
			<span>{props.sentence}</span>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						onClick={() => act().onAct()}
						class={cn(
							"cursor-pointer font-medium underline underline-offset-4",
							RING,
						)}
					>
						{act().label}
					</button>
				)}
			</Show>
		</output>
	);
}

export { toast };
