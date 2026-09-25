import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { Ellipsis } from "lucide-solid";
import { createSignal, For, type JSX, Show } from "solid-js";
import { Circle } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FitContext } from "#lib/fit.ts";
import { MeasureContext, measured } from "#lib/measure.ts";
import { useWords } from "#lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { ListRow } from "../list-row/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A place of the shell: the large title on the top bar's row, at most two
// actions as circles beside it with the rest under a more circle, and the
// place's primary act as a pill floating above the tab bar on the phone, in
// the top bar from tablet.
// The body is measured at the reading width, centred, unless a `Columns`
// inside claims the whole column.
export type PlaceProps = Closed & {
	title: string;
	actions?: IconAct<string>[];
	act?: Act;
	// Labelled acts under the more circle, after the actions past two.
	more?: Act[];
	children?: JSX.Element;
};

const SHOWN = 2;

export function Place(props: PlaceProps) {
	const words = useWords();
	const [more, setMore] = createSignal(false);
	const [whole, setWhole] = createSignal(false);
	const shown = () => (props.actions ?? []).slice(0, SHOWN);
	const rest = () => (props.actions ?? []).slice(SHOWN);
	return (
		<MeasureContext.Provider value={setWhole}>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<FitContext.Provider value="bar">
					{/* The row is measured as the body is, so the title and the act
				    stand over the content's edges. */}
					<header class="flex min-h-14 px-inset tablet:px-section">
						<div class={cn("flex items-center gap-row", measured(whole()))}>
							<h1
								class={cn(text({ role: "title" }), "min-w-0 flex-1 truncate")}
							>
								{props.title}
							</h1>
							<Show when={props.act}>
								{(act) => (
									<div class="hidden tablet:block">
										<Button
											act="primary"
											label={act().label}
											onAct={act().onAct}
											blocked={act().blocked}
											loading={act().loading}
										/>
									</div>
								)}
							</Show>
							<For each={shown()}>
								{(action) => (
									<IconButton
										icon={action.icon}
										label={action.label}
										onAct={action.onAct}
									/>
								)}
							</For>
							<Show when={rest().length + (props.more?.length ?? 0) > 0}>
								<Circle
									glyph={Ellipsis}
									label={words.more}
									onAct={() => setMore(true)}
								/>
							</Show>
						</div>
					</header>
				</FitContext.Provider>
				{/* On the phone the act floats over the body's end: the body keeps
			    room under its last row for the pill and its inset. */}
				<div
					class={cn(
						"flex min-h-0 flex-1 flex-col overflow-y-auto px-inset pb-section tablet:px-section",
						props.act &&
							"pb-[calc(var(--spacing-section)+var(--spacing-inset)+44px)] tablet:pb-section",
					)}
				>
					<div
						class={cn(
							"flex flex-1 shrink-0 flex-col gap-section *:shrink-0",
							measured(whole()),
						)}
					>
						{props.children}
					</div>
				</div>
				<Show when={props.act}>
					{(act) => (
						<div class="absolute right-inset bottom-inset tablet:hidden">
							<Button
								act="primary"
								label={act().label}
								onAct={act().onAct}
								blocked={act().blocked}
								loading={act().loading}
							/>
						</div>
					)}
				</Show>
				<Sheet open={more()} onClose={() => setMore(false)} title={props.title}>
					<For each={rest()}>
						{(action) => (
							<ListRow
								leading={{ icon: action.icon }}
								title={action.label}
								onOpen={() => {
									setMore(false);
									action.onAct();
								}}
							/>
						)}
					</For>
					<For each={props.more ?? []}>
						{(act) => (
							<ListRow
								title={act.label}
								meta={act.blocked ? [act.blocked] : undefined}
								onOpen={
									act.blocked === undefined
										? () => {
												setMore(false);
												act.onAct();
											}
										: undefined
								}
							/>
						)}
					</For>
				</Sheet>
			</div>
		</MeasureContext.Provider>
	);
}
