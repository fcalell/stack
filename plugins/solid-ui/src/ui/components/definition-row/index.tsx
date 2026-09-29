import type { Act } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { row, text } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { createSignal, type JSX, Match, Show, Switch } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING_INSET, TEXT_ACT, WASH } from "#lib/interact.ts";
import { createWidthClaims } from "#lib/measure.ts";
import { RowContext } from "#lib/row.ts";
import { useWords } from "#lib/words.tsx";
import { Status } from "../status/index.tsx";

export type DefinitionValue =
	| string
	| { status: StatusState; label?: string }
	| JSX.Element;

// A labelled fact in a group: the label left, the value or the in-place
// control right, and the description under both at the row's width.
// `copyable` puts a copy act beside a string value. The value takes its own
// width up to three fifths and the label the rest, and each wraps inside
// its width at any character, so an address never runs under the other. A
// control whose width is its words (a `Picker`) claims the row, and under
// tablet the row then stacks: the label and the description, then the
// control across the row with the act at its end.
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

// The row's vertical padding is given to the act, so its hit area at the floor
// leaves the row as tall as one with no act.
const ACT = cn("-my-row-y min-h-floor shrink-0 px-row", TEXT_ACT);

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

export function DefinitionRow(props: DefinitionRowProps) {
	const words = useWords();
	const [copied, setCopied] = createSignal(false);
	const claims = createWidthClaims();
	const stacked = claims.whole;
	const interactive = () =>
		props.href !== undefined || props.onOpen !== undefined;
	const shell = () =>
		cn(
			row({ state: "rest" }),
			"flex w-full flex-col justify-center gap-pair text-left",
			interactive() &&
				cn(
					"cursor-pointer transition-colors duration-(--duration-fast) ease-ui",
					WASH,
					RING_INSET,
				),
		);
	const copy = async () => {
		if (typeof props.value !== "string") return;
		await navigator.clipboard.writeText(props.value);
		setCopied(true);
		setTimeout(() => setCopied(false), COPIED_MS);
	};
	const body = () => (
		<>
			{/* Stacked, the line dissolves under tablet so the value comes
			    after the description in the row's column. */}
			<span
				class={cn(
					stacked()
						? "contents tablet:flex tablet:w-full tablet:items-center tablet:gap-stack"
						: "flex w-full items-center gap-stack",
				)}
			>
				<span
					class={cn(text({ role: "body" }), "min-w-0 flex-1 wrap-anywhere")}
				>
					{props.label}
				</span>
				<span
					class={cn(
						"flex items-center gap-stack",
						stacked()
							? "order-last w-full tablet:order-none tablet:w-auto tablet:max-w-3/5 tablet:shrink-0"
							: "contents",
					)}
				>
					<Show when={props.value !== undefined}>
						<span
							class={cn(
								"flex items-center justify-end gap-row text-right wrap-anywhere",
								stacked()
									? "min-w-0 flex-1 tablet:flex-none"
									: "max-w-3/5 shrink-0",
							)}
						>
							<RowContext.Provider value={claims.claim}>
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
							</RowContext.Provider>
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
				</span>
			</span>
			<Show when={props.description}>
				<span class={text({ role: "meta" })}>{props.description}</span>
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
