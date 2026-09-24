import { text } from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import { createMemo, For, Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { LoadingRows } from "#lib/loading";

// Prose with an added run on the ok soft and a removed one on the danger
// soft, struck through.
export type ProseDiffProps = Closed & {
	before: string;
	after: string;
	loading?: boolean;
};

export function ProseDiff(props: ProseDiffProps) {
	const changes = createMemo(() => diffWords(props.before, props.after));
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<p
				class={cn(
					text({ role: "body" }),
					"max-w-reading whitespace-pre-wrap break-words",
				)}
			>
				<For each={changes()}>
					{(change) => (
						<Show
							when={change.added || change.removed}
							fallback={<span>{change.value}</span>}
						>
							<Show
								when={change.added}
								fallback={
									<del class="bg-danger-soft line-through">{change.value}</del>
								}
							>
								<ins class="bg-ok-soft no-underline">{change.value}</ins>
							</Show>
						</Show>
					)}
				</For>
			</p>
		</Show>
	);
}
