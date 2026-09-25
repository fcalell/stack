import type { Act } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { row, text } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { createSignal, type JSX, Match, Show, Switch } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useWords } from "#lib/words.tsx";
import { Status } from "../status/index.tsx";

export type DefinitionValue =
	| string
	| { status: StatusState; label?: string }
	| JSX.Element;

// A labelled fact in a group: label and description left, the value or the
// in-place control right. `copyable` puts a copy act beside a string value.
// A value longer than its side wraps inside it, at any character, so a key
// or an address never runs under the label.
export type DefinitionRowProps = Closed & {
	label: string;
	description?: string;
	value?: DefinitionValue;
	copyable?: boolean;
	act?: Act;
	href?: string;
	onOpen?: () => void;
};

const COPIED_MS = 2000;

// The row's vertical padding is given to the act, so its 44 px hit area
// leaves the row as tall as one with no act.
const ACT =
	"-my-stack min-h-11 shrink-0 cursor-pointer px-row font-medium text-tint disabled:text-ink-faint";

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

export function DefinitionRow(props: DefinitionRowProps) {
	const words = useWords();
	const [copied, setCopied] = createSignal(false);
	const interactive = () =>
		props.href !== undefined || props.onOpen !== undefined;
	const shell = () =>
		cn(
			row({ state: "rest" }),
			"flex w-full items-center text-left",
			interactive() &&
				"cursor-pointer transition-colors duration-(--duration-fast) ease-ui hover:bg-edge active:bg-edge focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint",
		);
	const copy = async () => {
		if (typeof props.value !== "string") return;
		await navigator.clipboard.writeText(props.value);
		setCopied(true);
		setTimeout(() => setCopied(false), COPIED_MS);
	};
	const body = () => (
		<>
			<span class="flex min-w-0 flex-1 basis-2/5 flex-col">
				<span class={text({ role: "body" })}>{props.label}</span>
				<Show when={props.description}>
					<span class={text({ role: "meta" })}>{props.description}</span>
				</Show>
			</span>
			<Show when={props.value !== undefined}>
				<span class="flex min-w-0 max-w-3/5 items-center justify-end gap-row text-right wrap-anywhere">
					<Switch fallback={props.value as JSX.Element}>
						<Match when={typeof props.value === "string" && props.value}>
							{(value) => (
								<span class={cn(text({ role: "meta" }), "text-ink")}>
									{value()}
								</span>
							)}
						</Match>
						<Match when={isStatus(props.value) && props.value}>
							{(value) => (
								<Status state={value().status} label={value().label} />
							)}
						</Match>
					</Switch>
				</span>
			</Show>
			<Show when={props.copyable && typeof props.value === "string"}>
				<button
					type="button"
					class={cn(text({ role: "meta" }), ACT)}
					onClick={(event) => {
						event.stopPropagation();
						void copy();
					}}
				>
					{copied() ? words.copied : words.copy}
				</button>
			</Show>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						disabled={act().blocked !== undefined}
						class={cn(text({ role: "meta" }), ACT)}
						onClick={(event) => {
							event.stopPropagation();
							act().onAct();
						}}
					>
						{act().label}
					</button>
				)}
			</Show>
		</>
	);
	return (
		<Switch fallback={<div class={shell()}>{body()}</div>}>
			<Match when={props.href}>
				{(href) => (
					<A href={href()} class={shell()}>
						{body()}
					</A>
				)}
			</Match>
			<Match when={props.onOpen}>
				{(onOpen) => (
					<button type="button" class={shell()} onClick={() => onOpen()()}>
						{body()}
					</button>
				)}
			</Match>
		</Switch>
	);
}
