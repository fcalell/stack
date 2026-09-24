import type { Act } from "@fcalell/ui-core/descriptors";
import { PENDING_BAR, PENDING_FILL, text } from "@fcalell/ui-core/variants";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { Spinner } from "../spinner/index.tsx";

// One line with a spinner, or a countdown that fills the bar toward a server
// deadline, and one act. Placed in an `ActionBar`'s place, a `Sheet`'s foot,
// above a message input, or as a row of a thread.
export type PendingBarProps = Closed & {
	sentence: string;
	until?: Date;
	act?: Act;
};

const TICK_MS = 250;

export function PendingBar(props: PendingBarProps) {
	const started = Date.now();
	const [now, setNow] = createSignal(started);
	onMount(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		onCleanup(() => clearInterval(timer));
	});
	const progress = () => {
		const until = props.until;
		if (!until) return 0;
		const total = until.getTime() - started;
		if (total <= 0) return 1;
		return Math.min(1, (now() - started) / total);
	};
	return (
		<div
			role="status"
			class={cn(PENDING_BAR, "relative flex items-center overflow-hidden")}
		>
			<Show when={props.until}>
				<div
					class={cn(PENDING_FILL, "absolute inset-y-0 left-0")}
					style={{ width: `${progress() * 100}%` }}
					aria-hidden="true"
				/>
			</Show>
			<span class="relative flex min-w-0 flex-1 items-center gap-row">
				<Show when={!props.until}>
					<Spinner />
				</Show>
				<span class={cn(text({ role: "meta" }), "truncate text-ink")}>
					{props.sentence}
				</span>
			</span>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						disabled={act().blocked !== undefined}
						onClick={() => act().onAct()}
						class={cn(
							text({ role: "meta" }),
							"relative shrink-0 cursor-pointer font-medium text-tint disabled:text-ink-faint",
						)}
					>
						{act().label}
					</button>
				)}
			</Show>
		</div>
	);
}
