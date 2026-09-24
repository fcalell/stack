import type { Act } from "@fcalell/ui-core/descriptors";
import { type BannerKind, banner } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// Full width under the top bar on the kind's soft fill: the shell's for the
// app's state, a screen's or a sheet's for its own.
export type BannerProps = Closed & {
	kind?: BannerKind;
	sentence: string;
	act?: Act;
};

export function Banner(props: BannerProps) {
	return (
		<div
			role={props.kind === "danger" ? "alert" : "status"}
			class={cn(
				banner({ kind: props.kind ?? "note" }),
				"flex items-center justify-between",
			)}
		>
			<span class="min-w-0 flex-1">{props.sentence}</span>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						disabled={act().blocked !== undefined}
						onClick={() => act().onAct()}
						class="min-h-11 shrink-0 cursor-pointer font-medium text-tint disabled:text-ink-faint"
					>
						{act().label}
					</button>
				)}
			</Show>
		</div>
	);
}
