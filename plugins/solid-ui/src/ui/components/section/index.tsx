import type { Act } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { ChevronDown } from "lucide-solid";
import {
	createContext,
	createSignal,
	createUniqueId,
	type JSX,
	Show,
	useContext,
} from "solid-js";
import { BarContext } from "#lib/bar.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING, TEXT_ACT } from "#lib/interact.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { Count } from "../count/index.tsx";

// A titled region of a screen: the label header with its count and act.
// `folded` makes it fold, starting folded when true and open when false;
// without it the header is a plain label. The space above it is its
// container's gap; a nested section, which sits in its parent's tight
// rhythm, takes `stack` above it. An `ActionBar` inside is the section's
// own, in flow at its end, never pinned to the screen.
export type SectionProps = Closed & {
	title: string;
	count?: number;
	description?: string;
	folded?: boolean;
	// Called as a foldable section opens or closes, with its new state: what
	// the consumer does with what it showed, such as marking it read once
	// it folds again.
	onToggle?: (open: boolean) => void;
	act?: Act;
	loading?: boolean;
	children?: JSX.Element;
};

const Nested = createContext(false);

export function Section(props: SectionProps) {
	const nested = useContext(Nested);
	const [open, setOpen] = createSignal(!props.folded);
	const foldable = () => props.folded !== undefined;
	const id = createUniqueId();
	const label = () => (
		<>
			<h2 id={id} class={cn(text({ role: "label" }), "truncate")}>
				{props.title}
			</h2>
			<Show when={props.count !== undefined}>
				<Count value={props.count ?? 0} />
			</Show>
		</>
	);
	return (
		<Nested.Provider value={true}>
			{/* A foldable section is a disclosure group, not a landmark: a screen
			    may fold several under one name ("Did 2 things"), and landmarks
			    must be unique. */}
			<section
				aria-labelledby={id}
				role={foldable() ? "group" : undefined}
				class={cn("flex flex-col gap-row", nested && "pt-stack")}
			>
				{/* The description is the label's own line, a pair below it, so it
				    never reads as the section's content. */}
				<div class="flex min-h-floor items-center justify-between gap-row">
					<div class="flex min-w-0 flex-col gap-pair">
						<Show
							when={foldable()}
							fallback={
								<div class="flex min-w-0 items-center gap-pair">{label()}</div>
							}
						>
							<button
								type="button"
								aria-expanded={open()}
								onClick={() => {
									const next = !open();
									setOpen(next);
									props.onToggle?.(next);
								}}
								class={cn(
									"flex min-h-floor min-w-0 cursor-pointer items-center gap-pair self-start text-left",
									RING,
								)}
							>
								{label()}
								<ChevronDown
									class={cn(
										"size-4 shrink-0 text-ink-faint transition-transform duration-(--duration-base) ease-ui",
										open() || "-rotate-90",
									)}
									aria-hidden="true"
								/>
							</button>
						</Show>
						<Show when={props.description}>
							<p class={text({ role: "meta" })}>{props.description}</p>
						</Show>
					</div>
					<Show when={props.act}>
						{(act) => (
							<button
								type="button"
								disabled={act().blocked !== undefined}
								onClick={() => act().onAct()}
								class={cn(
									text({ role: "meta" }),
									"min-h-floor shrink-0",
									TEXT_ACT,
								)}
							>
								{act().label}
							</button>
						)}
					</Show>
				</div>
				<Show when={open()}>
					<Show when={!props.loading} fallback={<LoadingRows />}>
						<BarContext.Provider value="flow">
							{props.children}
						</BarContext.Provider>
					</Show>
				</Show>
			</section>
		</Nested.Provider>
	);
}
