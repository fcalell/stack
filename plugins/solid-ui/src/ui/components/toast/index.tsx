import type { Act } from "@fcalell/ui-core/descriptors";
import { TOAST } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING } from "#lib/interact.ts";
import { toast } from "#lib/toast.ts";

// The dark pill above the bar; client-owned, so never an undo. `toast()`
// queues one and the `Shell` draws the queue.
export type ToastProps = Closed & {
	sentence: string;
	act?: Act;
};

export function Toast(props: ToastProps) {
	return (
		<output class={cn(TOAST, "flex items-center shadow-float")}>
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
