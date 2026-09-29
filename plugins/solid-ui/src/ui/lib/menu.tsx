import type { Act, IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import { GROUP, HAIRLINE, row, text } from "@fcalell/ui-core/variants";
import * as DropdownMenuPrimitive from "@kobalte/core/dropdown-menu";
import { Ellipsis } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { circle, glyph } from "#lib/circle.tsx";
import { cn } from "#lib/cn.ts";
import { useFit } from "#lib/fit.ts";
import { useIcon } from "#lib/icons.tsx";
import { RING_INSET, WASH } from "#lib/interact.ts";
import { Sheet } from "../components/sheet/index.tsx";

export type MenuItems = MenuItem<string>[] | MenuItem<string>[][];

// A flat list is one group; a list of lists is groups under separators.
export function groupsOf(items: MenuItems): MenuItem<string>[][] {
	if (items.length === 0) return [];
	return Array.isArray(items[0])
		? (items as MenuItem<string>[][])
		: [items as MenuItem<string>[]];
}

// A top bar's more circle holds the actions past its circles, each with its
// glyph, then the labelled `more` acts under a separator.
export function barItems(
	actions: IconAct<string>[],
	more: Act[],
): MenuItem<string>[][] {
	return [
		actions.map((action) => ({
			label: action.label,
			icon: action.icon,
			onAct: action.onAct,
		})),
		more.map((act) => ({
			label: act.label,
			onAct: act.onAct,
			blocked: act.blocked,
		})),
	].filter((group) => group.length > 0);
}

// Whether the viewport is at `breakpoints.tablet` or wider, read off a probe
// the stylesheet hides under it, so the width is the theme's own.
function fromTablet(): boolean {
	const probe = document.createElement("div");
	probe.className = "hidden tablet:block";
	document.body.append(probe);
	const wide = getComputedStyle(probe).display !== "none";
	probe.remove();
	return wide;
}

const ITEM = cn(
	row({ state: "rest" }),
	"flex w-full cursor-pointer items-center text-left outline-none transition-colors duration-(--duration-fast) ease-ui data-[disabled]:cursor-not-allowed",
	WASH,
	RING_INSET,
);

function ItemBody(props: { item: MenuItem<string> }) {
	return (
		<>
			<Show when={props.item.icon}>
				{(icon) => (
					<Dynamic
						component={useIcon(icon())}
						class="size-5 shrink-0 text-ink-meta"
						aria-hidden="true"
					/>
				)}
			</Show>
			<span class="flex min-w-0 flex-1 flex-col">
				<span
					class={cn(
						text({ role: "body" }),
						"truncate",
						props.item.destructive && "text-danger",
						props.item.blocked !== undefined && "text-ink-faint",
					)}
				>
					{props.item.label}
				</span>
				<Show when={props.item.blocked}>
					<span class={text({ role: "meta" })}>{props.item.blocked}</span>
				</Show>
			</span>
		</>
	);
}

// A more circle, `label` read aloud, opening its acts: anchored under the
// circle from tablet, a sheet titled `title` under it. Groups sit under
// hairlines, a destructive act in `danger`, a blocked one disabled with its
// reason under its label. The arrows move through the anchored list, Enter
// takes an act, Escape closes it, and focus goes back to the circle; opening
// one menu closes whatever else is open.
export function MenuCircle(props: {
	label: string;
	title: string;
	items: MenuItems;
}) {
	const fit = useFit();
	const [open, setOpen] = createSignal(false);
	const [anchored, setAnchored] = createSignal(true);
	const groups = () => groupsOf(props.items);
	return (
		<>
			<DropdownMenuPrimitive.Root
				open={open() && anchored()}
				onOpenChange={(next) => {
					if (next) setAnchored(fromTablet());
					setOpen(next);
				}}
				placement="bottom-end"
			>
				<DropdownMenuPrimitive.Trigger
					aria-label={props.label}
					class={circle(fit)}
				>
					<Ellipsis class={glyph(fit)} aria-hidden="true" />
				</DropdownMenuPrimitive.Trigger>
				<DropdownMenuPrimitive.Portal>
					<DropdownMenuPrimitive.Content
						class={cn(
							GROUP,
							"z-50 flex min-w-48 flex-col overflow-hidden bg-surface shadow-float outline-none animate-content-hide data-[expanded]:animate-content-show",
						)}
					>
						<For each={groups()}>
							{(group, at) => (
								<>
									<Show when={at() > 0}>
										<DropdownMenuPrimitive.Separator
											class={cn(HAIRLINE, "border-t")}
										/>
									</Show>
									<DropdownMenuPrimitive.Group class="flex flex-col">
										<For each={group}>
											{(item) => (
												<DropdownMenuPrimitive.Item
													disabled={item.blocked !== undefined}
													onSelect={() => item.onAct()}
													class={ITEM}
												>
													<ItemBody item={item} />
												</DropdownMenuPrimitive.Item>
											)}
										</For>
									</DropdownMenuPrimitive.Group>
								</>
							)}
						</For>
					</DropdownMenuPrimitive.Content>
				</DropdownMenuPrimitive.Portal>
			</DropdownMenuPrimitive.Root>
			<Sheet
				open={open() && !anchored()}
				onClose={() => setOpen(false)}
				title={props.title}
			>
				<For each={groups()}>
					{(group, at) => (
						<ul
							class={cn(
								"-mx-inset flex flex-col",
								at() > 0 && cn(HAIRLINE, "border-t"),
							)}
						>
							<For each={group}>
								{(item) => (
									<li>
										<button
											type="button"
											disabled={item.blocked !== undefined}
											onClick={() => {
												setOpen(false);
												item.onAct();
											}}
											class={ITEM}
										>
											<ItemBody item={item} />
										</button>
									</li>
								)}
							</For>
						</ul>
					)}
				</For>
			</Sheet>
		</>
	);
}
