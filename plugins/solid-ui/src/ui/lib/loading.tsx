import { GROUP } from "@fcalell/ui-core/variants";
import { For } from "solid-js";
import { cn } from "#lib/cn";
import { useWords } from "#lib/words";

// The loading form every container and content molecule draws: three row
// forms. On the surface each is a group-filled block; inside a group, where
// that fill is the ground, the form is an edge-filled line.
export function LoadingRows(props: { inGroup?: boolean }) {
	const words = useWords();
	return (
		<div role="status" aria-label={words.loading} class="flex flex-col">
			<For each={[0, 1, 2]}>
				{() =>
					props.inGroup ? (
						<div class="flex min-h-11 items-center px-inset">
							<div class="h-3 w-3/5 rounded-full bg-edge" />
						</div>
					) : (
						<div class="flex min-h-11 items-center">
							<div class={cn(GROUP, "h-8 w-full")} />
						</div>
					)
				}
			</For>
		</div>
	);
}
