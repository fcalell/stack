import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { PLACE_ROW_SELECTED, place } from "@fcalell/ui-core/variants";
import { A, useLocation } from "@solidjs/router";
import {
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FrameContext } from "#lib/frame.ts";
import { useIcon } from "#lib/icons.tsx";
import { RING, RING_INSET, WASH } from "#lib/interact.ts";
import { dismissToast, toasts } from "#lib/toast.ts";
import { Count } from "../count/index.tsx";
import { Toast } from "../toast/index.tsx";

// The frame at every width: the places as the system's tab bar under tablet
// and as the labelled sidebar from tablet, the app's banner under the top bar,
// the composed content, and the toast queue. A consumer with no places has no
// shell. A `Screen` fixed over the column on the phone starts under the
// banner, so the app's state stays in sight, and the tab bar it covers goes
// inert; the toasts sit above a pinned bar.
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
	// The place whose route is the longest prefix of the address, so a place
	// at "/" stays selected under every address no other place claims.
	const holds = (route: string) =>
		location.pathname === route ||
		location.pathname.startsWith(route.endsWith("/") ? route : `${route}/`);
	const selected = (spec: PlaceSpec<string>) =>
		props.places
			.filter((s) => holds(s.route))
			.reduce<PlaceSpec<string> | undefined>(
				(best, s) => (best && best.route.length >= s.route.length ? best : s),
				undefined,
			) === spec;
	const [covers, setCovers] = createSignal(0);
	const [lift, setLift] = createSignal(0);
	const [bannerHeight, setBannerHeight] = createSignal(0);
	const covered = () => covers() > 0;
	let banner!: HTMLDivElement;
	onMount(() => {
		const observer = new ResizeObserver(() =>
			setBannerHeight(banner.offsetHeight),
		);
		observer.observe(banner);
		onCleanup(() => observer.disconnect());
	});
	const frame = {
		cover: () => {
			setCovers((n) => n + 1);
			return () => setCovers((n) => n - 1);
		},
		lift: setLift,
	};
	return (
		<FrameContext.Provider value={frame}>
			<div
				class="flex h-dvh flex-col bg-canvas tablet:flex-row"
				style={{
					"--banner-height": `${bannerHeight()}px`,
					"--toast-bottom": `calc(var(--spacing-inset) + ${lift()}px)`,
				}}
			>
				<nav class="hidden w-rail shrink-0 flex-col gap-pair border-r p-stack tablet:flex">
					<For each={props.places}>
						{(spec) => (
							<A
								href={spec.route}
								aria-current={selected(spec) ? "page" : undefined}
								class={cn(
									place({ state: selected(spec) ? "selected" : "idle" }),
									"flex min-h-11 items-center gap-row rounded-group px-stack",
									WASH,
									RING,
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
					<div ref={banner}>{props.banner}</div>
					<main class="flex min-h-0 flex-1 flex-col">{props.children}</main>
					<div
						class={cn(
							"pointer-events-none inset-x-0 bottom-(--toast-bottom) z-50 flex flex-col items-center gap-row",
							covered() ? "fixed tablet:absolute" : "absolute",
						)}
					>
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
				<nav
					inert={covered() || undefined}
					class="flex border-t bg-canvas pb-[env(safe-area-inset-bottom)] tablet:hidden"
				>
					<For each={props.places}>
						{(spec) => (
							<A
								href={spec.route}
								aria-current={selected(spec) ? "page" : undefined}
								class={cn(
									place({ state: selected(spec) ? "selected" : "idle" }),
									"relative flex min-h-11 flex-1 flex-col items-center justify-center gap-pair py-row",
									RING_INSET,
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
		</FrameContext.Provider>
	);
}
