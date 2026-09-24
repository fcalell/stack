import type { Act } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { Button } from "../button/index.tsx";

// One sentence and the way to make the first one; with `title` it centers as
// a first screen. What the screen still has to show goes in the children.
export type EmptyStateProps = Closed & {
	title?: string;
	sentence: string;
	act?: Act;
	children?: JSX.Element;
};

export function EmptyState(props: EmptyStateProps) {
	return (
		<div
			role="status"
			class={cn(
				"flex flex-col items-center gap-stack py-section text-center",
				props.title && "min-h-0 flex-1 justify-center",
			)}
		>
			<Show when={props.title}>
				<h1 class={text({ role: "title" })}>{props.title}</h1>
			</Show>
			<p class={cn(text({ role: "meta" }), "max-w-reading")}>
				{props.sentence}
			</p>
			<Show when={props.act}>
				{(act) => (
					<Button
						act="secondary"
						label={act().label}
						onAct={act().onAct}
						blocked={act().blocked}
						loading={act().loading}
					/>
				)}
			</Show>
			{props.children}
		</div>
	);
}
