import type { Act } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { children, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { Button } from "../button/index.tsx";

// One sentence and the way to make the first one; with `title` it is a
// first screen, centred in the viewport. Alone in a body it is centred in
// the space the body leaves; what the screen still has to show goes in the
// children, and then it stays at the top above them.
export type EmptyStateProps = Closed & {
	title?: string;
	sentence: string;
	act?: Act;
	children?: JSX.Element;
};

export function EmptyState(props: EmptyStateProps) {
	const rest = children(() => props.children);
	return (
		<div
			role="status"
			class={cn(
				"flex flex-col items-center gap-stack py-section text-center",
				// A first screen stands alone outside the shell, so it fills the
				// viewport itself to centre.
				props.title && "min-h-dvh justify-center px-inset",
				!props.title && !rest.toArray().length && "flex-1 justify-center",
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
			{rest()}
		</div>
	);
}
