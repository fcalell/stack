import { row, text } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { Check } from "lucide-solid";
import { Match, Show, Switch } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { LoadingRows } from "#lib/loading";

// A row for a group: a ring that becomes a tick when seen, the path in mono,
// the counts trailing.
export type FileRowProps = Closed & {
	path: string;
	added?: number;
	removed?: number;
	seen?: boolean;
	href?: string;
	onOpen?: () => void;
	loading?: boolean;
};

export function FileRow(props: FileRowProps) {
	const shell = cn(
		row({ state: "rest" }),
		"flex w-full cursor-pointer items-center text-left transition-colors duration-(--duration-fast) ease-ui hover:bg-edge active:bg-edge focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint",
	);
	const body = () => (
		<>
			<span
				class={cn(
					"inline-flex size-5 shrink-0 items-center justify-center rounded-full",
					props.seen ? "bg-ok-soft text-ok" : "border border-edge",
				)}
				aria-hidden="true"
			>
				<Show when={props.seen}>
					<Check class="size-3.5" />
				</Show>
			</span>
			<span class={cn(text({ role: "mono" }), "min-w-0 flex-1 truncate")}>
				{props.path}
			</span>
			<span
				class={cn(text({ role: "meta" }), "flex shrink-0 gap-row tabular-nums")}
			>
				<Show when={props.added !== undefined}>
					<span class="text-ok">+{props.added}</span>
				</Show>
				<Show when={props.removed !== undefined}>
					<span class="text-danger">−{props.removed}</span>
				</Show>
			</span>
		</>
	);
	return (
		<Show when={!props.loading} fallback={<LoadingRows inGroup />}>
			<Switch fallback={<div class={shell}>{body()}</div>}>
				<Match when={props.href}>
					{(href) => (
						<A href={href()} class={shell}>
							{body()}
						</A>
					)}
				</Match>
				<Match when={props.onOpen}>
					{(onOpen) => (
						<button type="button" class={shell} onClick={() => onOpen()()}>
							{body()}
						</button>
					)}
				</Match>
			</Switch>
		</Show>
	);
}
