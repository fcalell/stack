import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { PLACE_ROW_SELECTED, place } from "@fcalell/ui-core/variants";
import { useLocation } from "@solidjs/router";
import {
	createEffect,
	createMemo,
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
import { selectedRoute } from "#lib/places.ts";
import { placeToasts } from "#lib/toast.ts";
import { Count } from "../count/index.tsx";

// The frame at every width: the places as the system's tab bar under tablet
// and as the labelled sidebar from tablet, the app's banner under the top bar,
// the composed content, and where the toasts stand: the app root draws the
// queue and the `confirm()` decisions on every page, and the shell places the
// toasts over its column, above its tab bar and any pinned bar. A consumer
// with no places has no shell. `switcher` is what switches what the app is looking at (an
// organization, a project): the head of the sidebar from tablet and, under
// it, the start of each `Place`'s top bar, never a `Screen`'s. A `Screen` fixed over the column on the phone starts under the
// banner, so the app's state stays in sight, and the tab bar it covers goes
// inert; the toasts sit above a pinned bar.
export type ShellProps = Closed & {
	places: PlaceSpec<string>[];
	banner?: JSX.Element;
	switcher?: JSX.Element;
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
	const current = createMemo(() =>
		selectedRoute(
			props.places.map((s) => s.route),
			location.pathname,
		),
	);
	const selected = (spec: PlaceSpec<string>) => current() === spec.route;
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
	// The toasts stand over the column, centred in it, above the tab bar the
	// column ends on and above a pinned bar's lift; a `Screen` covering the
	// column on the phone covers the tab bar too, so only the lift is left.
	let column!: HTMLDivElement;
	const [box, setBox] = createSignal({ left: 0, right: 0, below: 0 });
	onMount(() => {
		const measure = () => {
			const rect = column.getBoundingClientRect();
			setBox({
				left: rect.left,
				right: window.innerWidth - rect.right,
				below: window.innerHeight - rect.bottom,
			});
		};
		const observer = new ResizeObserver(measure);
		observer.observe(column);
		window.addEventListener("resize", measure);
		onCleanup(() => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
			placeToasts(undefined);
		});
	});
	createEffect(() => {
		const { left, right, below } = box();
		placeToasts({
			left,
			right,
			bottom: (covered() ? 0 : below) + lift(),
		});
	});
	const frame = {
		cover: () => {
			setCovers((n) => n + 1);
			return () => setCovers((n) => n - 1);
		},
		lift: setLift,
		switcher: () => props.switcher,
	};
	return (
		<FrameContext.Provider value={frame}>
			<div
				class="flex h-dvh flex-col bg-canvas tablet:flex-row"
				style={{
					"--banner-height": `${bannerHeight()}px`,
				}}
			>
				{/* Plain anchors, whose clicks the router takes: its `A` sets
				    aria-current to its own exact match, which a place at a prefix
				    of the address is not, and adds a class of its own. */}
				<nav class="hidden w-rail shrink-0 flex-col gap-pair border-r p-stack tablet:flex">
					<Show when={props.switcher}>
						{(switcher) => <div class="pb-row">{switcher()}</div>}
					</Show>
					<For each={props.places}>
						{(spec) => (
							<a
								href={spec.route}
								aria-current={selected(spec) ? "page" : undefined}
								class={cn(
									place({ state: selected(spec) ? "selected" : "idle" }),
									"flex min-h-floor items-center gap-row rounded-group px-stack",
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
							</a>
						)}
					</For>
				</nav>
				{/* min-w-0: beside the rail the column takes the width left, never
			    its content's widest line. */}
				<div
					ref={column}
					class="relative flex min-h-0 min-w-0 flex-1 flex-col bg-surface"
				>
					<div ref={banner}>{props.banner}</div>
					<main class="flex min-h-0 flex-1 flex-col">{props.children}</main>
				</div>
				<nav
					inert={covered() || undefined}
					class="flex border-t bg-canvas pb-[env(safe-area-inset-bottom)] tablet:hidden"
				>
					<For each={props.places}>
						{(spec) => (
							<a
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
							</a>
						)}
					</For>
				</nav>
			</div>
		</FrameContext.Provider>
	);
}
