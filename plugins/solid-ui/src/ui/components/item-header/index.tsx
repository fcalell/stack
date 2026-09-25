import type { Part } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { GROUP, text } from "@fcalell/ui-core/variants";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useHeadingClaim } from "#lib/heading.ts";
import { Parts } from "#lib/parts.tsx";
import { Status } from "../status/index.tsx";

// A status fact with `onOpen` is a chip that opens what it means.
export type Fact =
	| Part
	| { status: StatusState; label?: string; onOpen?: () => void };

// An id over a bold title, properties below: the overline's parts joined by a
// middle dot, the title wrapping to two lines, a row of statuses and meta.
// Inside a `Screen` the title is the page's one heading: the header claims
// it from the screen, loading included, so the title never draws twice.
export type ItemHeaderProps = Closed & {
	overline?: Part[];
	title: Part;
	facts?: Fact[];
	loading?: boolean;
};

function isStatus(
	fact: Fact,
): fact is { status: StatusState; label?: string; onOpen?: () => void } {
	return typeof fact === "object" && "status" in fact;
}

export function ItemHeader(props: ItemHeaderProps) {
	const claim = useHeadingClaim();
	const [heading, setHeading] = createSignal<HTMLHeadingElement>();
	claim?.(null);
	createEffect(() => claim?.(heading() ?? null));
	onCleanup(() => claim?.(undefined));
	return (
		<Show
			when={!props.loading}
			fallback={
				<div class="flex flex-col gap-row">
					<div class={cn(GROUP, "h-4 w-1/3")} />
					<div class={cn(GROUP, "h-8 w-4/5")} />
					<div class={cn(GROUP, "h-4 w-1/2")} />
				</div>
			}
		>
			<header class="flex flex-col gap-pair">
				<Show when={props.overline?.length}>
					<p class={text({ role: "meta" })}>
						<Parts parts={props.overline ?? []} cut />
					</p>
				</Show>
				<h1
					ref={setHeading}
					class={cn(text({ role: "title" }), "line-clamp-2")}
				>
					<Parts parts={[props.title]} />
				</h1>
				<Show when={props.facts?.length}>
					<div
						class={cn(
							text({ role: "meta" }),
							"flex flex-wrap items-center gap-row",
						)}
					>
						<For each={props.facts}>
							{(fact, index) => (
								<>
									<Show when={index() > 0}>
										<span aria-hidden="true">·</span>
									</Show>
									<Show
										when={isStatus(fact) && fact}
										fallback={<Parts parts={[fact as Part]} cut />}
									>
										{(status) => (
											<Status
												state={status().status}
												label={status().label}
												onOpen={status().onOpen}
											/>
										)}
									</Show>
								</>
							)}
						</For>
					</div>
				</Show>
			</header>
		</Show>
	);
}
