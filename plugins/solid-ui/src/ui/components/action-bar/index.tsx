import { rhythm } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { PINNED, useBarPlacement } from "#lib/bar.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// Buttons only, at most three, primary first; one `PendingBar` in their
// place. Pinned above the home indicator as a `Screen`'s child, in flow as a
// `Form`'s or a `Sheet`'s; full-width stacked on the phone, at their content's
// width in one wrapping row from desktop.
export type ActionBarProps = Closed & { children?: JSX.Element };

export function ActionBar(props: ActionBarProps) {
	const placement = useBarPlacement();
	return (
		<div
			class={cn(
				rhythm({ unit: "row" }),
				"flex flex-col *:w-full desktop:flex-row desktop:flex-wrap desktop:*:w-auto",
				placement === "pinned" && PINNED,
			)}
		>
			{props.children}
		</div>
	);
}
