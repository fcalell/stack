import type { IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { A } from "@solidjs/router";
import { ChevronLeft, Ellipsis } from "lucide-solid";
import {
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { BarContext } from "#lib/bar";
import { CIRCLE, Circle, GLYPH } from "#lib/circle";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { useWords } from "#lib/words";
import { IconButton } from "../icon-button/index.tsx";
import { ListRow } from "../list-row/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A screen pushed over a place: a back circle, the compact title once the
// large one scrolls away, its actions; no tab bar. On the phone it covers the
// shell; from tablet it sits in its slot. A pinned `ActionBar` child sits
// above the home indicator.
export type ScreenProps = Closed & {
	title: string;
	back?: string;
	actions?: IconAct<string>[];
	children?: JSX.Element;
};

const SHOWN = 2;

export function Screen(props: ScreenProps) {
	const words = useWords();
	const [compact, setCompact] = createSignal(false);
	const [more, setMore] = createSignal(false);
	let heading: HTMLHeadingElement | undefined;
	onMount(() => {
		if (!heading) return;
		const observer = new IntersectionObserver(([entry]) => {
			setCompact(entry ? !entry.isIntersecting : false);
		});
		observer.observe(heading);
		onCleanup(() => observer.disconnect());
	});
	const shown = () => (props.actions ?? []).slice(0, SHOWN);
	const rest = () => (props.actions ?? []).slice(SHOWN);
	return (
		<BarContext.Provider value="pinned">
			<div class="fixed inset-0 z-40 flex flex-col bg-surface tablet:static tablet:z-auto tablet:min-h-0 tablet:flex-1">
				<header class="flex min-h-14 items-center gap-row px-inset tablet:px-section">
					<Show when={props.back}>
						{(back) => (
							<A href={back()} aria-label={words.back} class={CIRCLE}>
								<ChevronLeft class={GLYPH} aria-hidden="true" />
							</A>
						)}
					</Show>
					{/* The compact title repeats the h1 for the eye once it has
					    scrolled away; the h1 stays the accessible title. */}
					<span
						aria-hidden="true"
						class={cn(
							text({ role: "heading" }),
							"min-w-0 flex-1 truncate transition-opacity duration-(--duration-base) ease-ui",
							compact() ? "opacity-100" : "opacity-0",
						)}
					>
						{props.title}
					</span>
					<For each={shown()}>
						{(action) => (
							<IconButton
								icon={action.icon}
								label={action.label}
								onAct={action.onAct}
							/>
						)}
					</For>
					<Show when={rest().length > 0}>
						<Circle
							glyph={Ellipsis}
							label={words.more}
							onAct={() => setMore(true)}
						/>
					</Show>
				</header>
				<div class="flex min-h-0 flex-1 flex-col gap-section overflow-y-auto px-inset tablet:px-section">
					<h1 ref={heading} class={text({ role: "title" })}>
						{props.title}
					</h1>
					{props.children}
				</div>
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
				</Sheet>
			</div>
		</BarContext.Provider>
	);
}
