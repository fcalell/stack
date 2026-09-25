import { CODE, text } from "@fcalell/ui-core/variants";
import { createMemo, createSignal, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { useWords } from "#lib/words.tsx";

// Mono, scrolling sideways, never wrapping. `tail` is the number of last
// lines shown before a tap unfolds the rest; `copy` draws the copy act
// beside the text, never over it: centred on one line, at the top of more.
export type CodeProps = Closed & {
	text: string;
	tail?: number;
	copy?: boolean;
	loading?: boolean;
};

const COPIED_MS = 2000;

export function Code(props: CodeProps) {
	const words = useWords();
	const [unfolded, setUnfolded] = createSignal(false);
	const [copied, setCopied] = createSignal(false);
	const lines = createMemo(() => props.text.split("\n"));
	const folded = () =>
		props.tail !== undefined && !unfolded() && lines().length > props.tail;
	const shown = () =>
		folded() ? lines().slice(lines().length - (props.tail ?? 0)) : lines();
	const hidden = () => lines().length - shown().length;
	const copy = async () => {
		await navigator.clipboard.writeText(props.text);
		setCopied(true);
		setTimeout(() => setCopied(false), COPIED_MS);
	};
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div class={cn(CODE, "flex flex-col gap-row")}>
				<Show when={folded()}>
					<button
						type="button"
						onClick={() => setUnfolded(true)}
						class={cn(
							text({ role: "meta" }),
							"cursor-pointer self-start text-tint",
						)}
					>
						… {hidden()}
					</button>
				</Show>
				<div
					class={cn(
						"flex gap-row",
						shown().length === 1 ? "items-center" : "items-start",
					)}
				>
					{/* Scrolling sideways, it takes focus so a keyboard can scroll it. */}
					<pre
						tabindex="0"
						class={cn(
							text({ role: "mono" }),
							"min-w-0 flex-1 overflow-x-auto whitespace-pre",
						)}
					>
						{shown().join("\n")}
					</pre>
					<Show when={props.copy}>
						<button
							type="button"
							onClick={() => void copy()}
							class={cn(
								text({ role: "meta" }),
								"-my-stack -mr-row min-h-11 shrink-0 cursor-pointer px-row font-medium text-tint",
							)}
						>
							{copied() ? words.copied : words.copy}
						</button>
					</Show>
				</div>
			</div>
		</Show>
	);
}
