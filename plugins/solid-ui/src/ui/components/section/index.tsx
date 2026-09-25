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
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { Count } from "../count/index.tsx";

// A titled region of a screen: the label header with its count and act.
// `folded` makes it fold, starting folded when true and open when false;
// without it the header is a plain label. The space above it is its
// container's gap; a nested section, which sits in its parent's tight
// rhythm, takes `stack` above it.
export type SectionProps = Closed & {
	title: string;
	count?: number;
	description?: string;
	folded?: boolean;
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
			<section
				aria-labelledby={id}
				class={cn("flex flex-col gap-row", nested && "pt-stack")}
			>
				<div class="flex min-h-11 items-center justify-between gap-row">
					<Show
						when={foldable()}
						fallback={
							<div class="flex min-w-0 items-center gap-pair">{label()}</div>
						}
					>
						<button
							type="button"
							aria-expanded={open()}
							onClick={() => setOpen((value) => !value)}
							class="flex min-h-11 min-w-0 cursor-pointer items-center gap-pair self-stretch text-left"
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
					<Show when={props.act}>
						{(act) => (
							<button
								type="button"
								disabled={act().blocked !== undefined}
								onClick={() => act().onAct()}
								class={cn(
									text({ role: "meta" }),
									"min-h-11 shrink-0 cursor-pointer font-medium text-tint disabled:text-ink-faint",
								)}
							>
								{act().label}
							</button>
						)}
					</Show>
				</div>
				<Show when={props.description}>
					<p class={text({ role: "meta" })}>{props.description}</p>
				</Show>
				<Show when={open()}>
					<Show when={!props.loading} fallback={<LoadingRows />}>
						{props.children}
					</Show>
				</Show>
			</section>
		</Nested.Provider>
	);
}
