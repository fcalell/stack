import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { createMemo, For, type JSX, Show, useContext } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FitContext } from "#lib/fit.ts";
import { FrameContext } from "#lib/frame.ts";
import { RING_INSET } from "#lib/interact.ts";
import { createWidthClaims, MeasureContext, measured } from "#lib/measure.ts";
import { barItems, MenuCircle } from "#lib/menu.tsx";
import { reachable } from "#lib/reach.ts";
import { useWords } from "#lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

// A place of the shell: the large title on the top bar's row, at most two
// actions as circles beside it with the rest under a more circle, and the
// place's primary act as a pill floating above the tab bar on the phone, in
// the top bar from tablet. Under tablet the shell's `switcher` starts the top
// bar's row, since the sidebar that holds it from tablet is not drawn, and
// the title wraps on its own line under it; a title is never truncated.
// The body is measured at the reading width, centred, unless a `Columns`
// inside claims the whole column. With `bleed` the body is the column's
// whole remaining box, with no side inset, no measure and no scroll, so a
// child that pans or scrolls itself (a canvas) owns every pixel under the
// top bar.
export type PlaceProps = Closed & {
	title: string;
	actions?: IconAct<string>[];
	act?: Act;
	// Labelled acts under the more circle, after the actions past two.
	more?: Act[];
	bleed?: boolean;
	children?: JSX.Element;
};

const SHOWN = 2;

export function Place(props: PlaceProps) {
	const words = useWords();
	const frame = useContext(FrameContext);
	const claims = createWidthClaims();
	const whole = claims.whole;
	const shown = () => (props.actions ?? []).slice(0, SHOWN);
	const rest = () => (props.actions ?? []).slice(SHOWN);
	// A bled body spans the column, so the top bar's row does too.
	const span = () => whole() || props.bleed === true;
	// Read once: each read of a JSX prop draws it anew.
	const switcher = createMemo(() => frame?.switcher());
	return (
		<MeasureContext.Provider value={claims.claim}>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<FitContext.Provider value="bar">
					{/* The row is measured as the body is, so the title and the act
				    stand over the content's edges. Under tablet a switcher and the
				    circles take the first line and the title its own line under
				    them: a title wraps, never truncates. */}
					<header class="flex min-h-14 px-inset tablet:px-section">
						<div
							class={cn(
								"flex flex-wrap items-center gap-x-row",
								measured(span()),
							)}
						>
							<Show when={switcher()}>
								{(switcher) => (
									<div class="min-w-0 flex-1 tablet:hidden">{switcher()}</div>
								)}
							</Show>
							<h1
								class={cn(
									text({ role: "title" }),
									"min-w-0 grow wrap-break-word",
									switcher()
										? "order-last basis-full pb-row tablet:order-none tablet:basis-0 tablet:pb-0"
										: "basis-0",
								)}
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
											spinner={act().spinner}
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
								<MenuCircle
									label={words.more}
									title={props.title}
									items={barItems(rest(), props.more ?? [])}
								/>
							</Show>
						</div>
					</header>
				</FitContext.Provider>
				<Show
					when={props.bleed}
					fallback={
						// On the phone the act floats over the body's end: the body
						// keeps room under its last row for the pill and its inset.
						<div
							ref={reachable}
							class={cn(
								"flex min-h-0 flex-1 flex-col overflow-y-auto px-inset pb-section tablet:px-section",
								RING_INSET,
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
					}
				>
					<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
						{props.children}
					</div>
				</Show>
				<Show when={props.act}>
					{(act) => (
						<div class="absolute right-inset bottom-inset tablet:hidden">
							<Button
								act="primary"
								label={act().label}
								onAct={act().onAct}
								blocked={act().blocked}
								loading={act().loading}
								spinner={act().spinner}
							/>
						</div>
					)}
				</Show>
			</div>
		</MeasureContext.Provider>
	);
}
