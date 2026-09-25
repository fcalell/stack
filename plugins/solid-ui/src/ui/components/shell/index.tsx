import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { PLACE_ROW_SELECTED, place } from "@fcalell/ui-core/variants";
import { A, useLocation } from "@solidjs/router";
import { For, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useIcon } from "#lib/icons.tsx";
import { dismissToast, toasts } from "#lib/toast.ts";
import { Count } from "../count/index.tsx";
import { Toast } from "../toast/index.tsx";

// The frame at every width: the places as the system's tab bar under tablet
// and as the labelled sidebar from tablet, the app's banner under the top bar,
// the composed content, and the toast queue. A consumer with no places has no
// shell.
export type ShellProps = Closed & {
	places: PlaceSpec<string>[];
	banner?: JSX.Element;
	children?: JSX.Element;
};

function PlaceGlyph(props: { name: string; selected: boolean }) {
	return (
		<Dynamic
			component={useIcon(props.name)}
			class={cn(
				"size-6 shrink-0",
				place({ state: props.selected ? "selected" : "idle" }),
			)}
			aria-hidden="true"
		/>
	);
}

export function Shell(props: ShellProps) {
	const location = useLocation();
	const selected = (spec: PlaceSpec<string>) =>
		location.pathname === spec.route ||
		location.pathname.startsWith(`${spec.route}/`);
	return (
		<div class="flex h-dvh flex-col bg-canvas tablet:flex-row">
			<nav class="hidden w-rail shrink-0 flex-col gap-pair border-r p-stack tablet:flex">
				<For each={props.places}>
					{(spec) => (
						<A
							href={spec.route}
							aria-current={selected(spec) ? "page" : undefined}
							class={cn(
								place({ state: selected(spec) ? "selected" : "idle" }),
								"flex min-h-11 items-center gap-row rounded-group px-stack hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint",
								selected(spec) && PLACE_ROW_SELECTED,
							)}
						>
							<PlaceGlyph name={spec.icon} selected={selected(spec)} />
							<span class="flex-1 text-body">{spec.label}</span>
							<Show when={spec.count}>
								{(count) => <Count value={count()} />}
							</Show>
						</A>
					)}
				</For>
			</nav>
			{/* min-w-0: beside the rail the column takes the width left, never
			    its content's widest line. */}
			<div class="relative flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
				{props.banner}
				<main class="flex min-h-0 flex-1 flex-col">{props.children}</main>
				<div class="pointer-events-none absolute inset-x-0 bottom-inset z-50 flex flex-col items-center gap-row">
					<For each={toasts()}>
						{(entry) => (
							<div class="pointer-events-auto">
								<Toast
									sentence={entry.sentence}
									act={
										entry.act
											? {
													...entry.act,
													onAct: () => {
														dismissToast(entry.id);
														entry.act?.onAct();
													},
												}
											: undefined
									}
								/>
							</div>
						)}
					</For>
				</div>
			</div>
			<nav class="flex border-t bg-canvas pb-[env(safe-area-inset-bottom)] tablet:hidden">
				<For each={props.places}>
					{(spec) => (
						<A
							href={spec.route}
							aria-current={selected(spec) ? "page" : undefined}
							class={cn(
								place({ state: selected(spec) ? "selected" : "idle" }),
								"relative flex min-h-11 flex-1 flex-col items-center justify-center gap-pair py-row",
							)}
						>
							<PlaceGlyph name={spec.icon} selected={selected(spec)} />
							<span>{spec.label}</span>
							<Show when={spec.count}>
								{(count) => (
									<span class="absolute top-pair right-1/4">
										<Count value={count()} />
									</span>
								)}
							</Show>
						</A>
					)}
				</For>
			</nav>
		</div>
	);
}
