import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { ChevronLeft, Ellipsis } from "lucide-solid";
import {
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { BarContext } from "#lib/bar.ts";
import { Circle, circle, glyph } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FitContext } from "#lib/fit.ts";
import { HeadingContext } from "#lib/heading.ts";
import { MeasureContext, measured } from "#lib/measure.ts";
import { useWords } from "#lib/words.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { ListRow } from "../list-row/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A screen pushed over a place: a back circle, the title compact and centred
// in the top bar, its actions; no tab bar. An `ItemHeader` inside claims the
// heading: the item's large title is the page's one heading, and the top
// bar's title appears once it scrolls away. The body is measured
// at the reading width, centred. On the phone it covers the
// shell; from tablet it sits in its slot. A pinned `ActionBar` child sits
// above the home indicator. `more` acts are labelled rows under the more
// circle, never circles of their own.
export type ScreenProps = Closed & {
	title: string;
	back?: string;
	actions?: IconAct<string>[];
	// Labelled acts under the more circle, after the actions past two: the
	// place for an act that is not a move, such as ending or removing.
	more?: Act[];
	children?: JSX.Element;
};

const SHOWN = 2;

export function Screen(props: ScreenProps) {
	const words = useWords();
	const [compact, setCompact] = createSignal(false);
	const [more, setMore] = createSignal(false);
	const [whole, setWhole] = createSignal(false);
	const [claimed, setClaimed] = createSignal<HTMLElement | null | undefined>();
	// Under a claim the top bar's title shows once the item's heading has
	// scrolled away; with no claim it is the heading and always shows.
	createEffect(() => {
		const target = claimed();
		if (!target) return;
		const observer = new IntersectionObserver(([entry]) => {
			setCompact(entry ? !entry.isIntersecting : false);
		});
		observer.observe(target);
		onCleanup(() => observer.disconnect());
	});
	const shown = () => (props.actions ?? []).slice(0, SHOWN);
	const rest = () => (props.actions ?? []).slice(SHOWN);
	return (
		<BarContext.Provider value="pinned">
			<HeadingContext.Provider value={setClaimed}>
				<MeasureContext.Provider value={setWhole}>
					<div class="fixed inset-0 z-40 flex flex-col bg-surface tablet:static tablet:z-auto tablet:min-h-0 tablet:flex-1">
						<FitContext.Provider value="bar">
							{/* Three columns keep the title centred whatever the sides
				    hold: each side is at least its content, the title shrinks. */}
							<header class="grid min-h-14 grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-row px-inset tablet:px-section">
								<div class="flex items-center">
									<Show when={props.back}>
										{(back) => (
											<A
												href={back()}
												aria-label={words.back}
												class={circle("bar")}
											>
												<ChevronLeft class={glyph("bar")} aria-hidden="true" />
											</A>
										)}
									</Show>
								</div>
								<Show
									when={claimed() !== undefined}
									fallback={
										<h1
											class={cn(
												text({ role: "heading" }),
												"min-w-0 truncate text-center",
											)}
										>
											{props.title}
										</h1>
									}
								>
									{/* The item's heading is the accessible title; this
					    repeats it for the eye once it has scrolled away. */}
									<span
										aria-hidden="true"
										class={cn(
											text({ role: "heading" }),
											"min-w-0 truncate text-center transition-opacity duration-(--duration-base) ease-ui",
											compact() ? "opacity-100" : "opacity-0",
										)}
									>
										{props.title}
									</span>
								</Show>
								<div class="flex items-center justify-end gap-row">
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
						<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-inset pb-section tablet:px-section">
							<div
								class={cn(
									"flex flex-1 shrink-0 flex-col gap-section *:shrink-0",
									measured(whole()),
								)}
							>
								{props.children}
							</div>
						</div>
						<Sheet
							open={more()}
							onClose={() => setMore(false)}
							title={props.title}
						>
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
			</HeadingContext.Provider>
		</BarContext.Provider>
	);
}
