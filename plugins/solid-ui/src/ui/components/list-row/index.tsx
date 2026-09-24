import type { Act, Mark, Part } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { GROUP, row, text, textStrong } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { For, type JSX, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useInColumns } from "#lib/columns.ts";
import { useIcon } from "#lib/icons.tsx";
import { Parts } from "#lib/parts.tsx";
import { StatusGlyph } from "#lib/status-glyph.tsx";
import { Count } from "../count/index.tsx";

export type Leading = { icon: string } | { status: StatusState };
export type Trailing = { age: string } | { count: number } | { value: string };

// A row of a list or a group: no chevron, no divider. `href` routes, `onOpen`
// opens; a row with neither is a line.
export type ListRowProps = Closed & {
	leading?: Leading;
	title: Part;
	meta?: Part[] | Part[][];
	trailing?: Trailing;
	marks?: Mark<string>[];
	act?: Act;
	href?: string;
	onOpen?: () => void;
};

function lines(meta: Part[] | Part[][] | undefined): Part[][] {
	if (!meta || meta.length === 0) return [];
	return Array.isArray(meta[0]) ? (meta as Part[][]) : [meta as Part[]];
}

function MarkGlyph(props: { mark: Mark<string> }) {
	return (
		<Dynamic
			component={useIcon(props.mark.icon)}
			class="size-4 shrink-0 text-ink-meta"
			role="img"
			aria-label={props.mark.label}
		/>
	);
}

export function ListRow(props: ListRowProps) {
	const inColumns = useInColumns();
	const interactive = () =>
		props.href !== undefined || props.onOpen !== undefined;
	const shell = () =>
		cn(
			row({ state: "rest" }),
			"flex w-full items-center text-left",
			interactive() &&
				"cursor-pointer transition-colors duration-(--duration-fast) ease-ui hover:bg-edge active:bg-edge focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint",
			inColumns && cn(GROUP, "hover:bg-edge"),
		);
	const body = () => (
		<>
			<Show when={props.leading}>
				{(leading) => (
					<span class="flex shrink-0 items-center text-body">
						<Switch>
							<Match when={"icon" in leading() && leading()}>
								{(lead) => (
									<Dynamic
										component={useIcon((lead() as { icon: string }).icon)}
										class="size-5 text-ink-meta"
										aria-hidden="true"
									/>
								)}
							</Match>
							<Match when={"status" in leading() && leading()}>
								{(lead) => (
									<StatusGlyph
										state={(lead() as { status: StatusState }).status}
									/>
								)}
							</Match>
						</Switch>
					</span>
				)}
			</Show>
			<span class="flex min-w-0 flex-1 flex-col">
				<span
					class={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						"line-clamp-2",
					)}
				>
					<Parts parts={[props.title]} />
				</span>
				<For each={lines(props.meta)}>
					{(line) => (
						<span class={cn(text({ role: "meta" }), "truncate")}>
							<Parts parts={line} cut />
						</span>
					)}
				</For>
			</span>
			<Show when={props.marks?.length}>
				<span class="flex shrink-0 items-center gap-pair">
					<For each={props.marks}>{(mark) => <MarkGlyph mark={mark} />}</For>
				</span>
			</Show>
			<Show when={props.trailing}>
				{(trailing) => (
					<Switch>
						<Match when={"count" in trailing() && trailing()}>
							{(count) => (
								<span class="shrink-0">
									<Count value={(count() as { count: number }).count} />
								</span>
							)}
						</Match>
						<Match when={!("count" in trailing())}>
							<span class={cn(text({ role: "meta" }), "shrink-0 tabular-nums")}>
								{"age" in trailing()
									? (trailing() as { age: string }).age
									: (trailing() as { value: string }).value}
							</span>
						</Match>
					</Switch>
				)}
			</Show>
		</>
	);
	const act = (): JSX.Element => (
		<Show when={props.act}>
			{(act) => (
				<button
					type="button"
					disabled={act().blocked !== undefined}
					onClick={(event) => {
						event.stopPropagation();
						act().onAct();
					}}
					class={cn(
						text({ role: "meta" }),
						"min-h-11 shrink-0 cursor-pointer px-row font-medium text-tint disabled:text-ink-faint",
					)}
				>
					{act().label}
				</button>
			)}
		</Show>
	);
	return (
		<li class="flex items-center">
			<Switch
				fallback={
					<div class={shell()}>
						{body()}
						{act()}
					</div>
				}
			>
				<Match when={props.href}>
					{(href) => (
						<A href={href()} class={shell()}>
							{body()}
							{act()}
						</A>
					)}
				</Match>
				<Match when={props.onOpen}>
					{(onOpen) => (
						<button type="button" class={shell()} onClick={() => onOpen()()}>
							{body()}
							{act()}
						</button>
					)}
				</Match>
			</Switch>
		</li>
	);
}
