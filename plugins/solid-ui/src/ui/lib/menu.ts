import type { MenuGroup, MenuItems } from "#components/dropdown-menu";

// ─── Shared style constants ───

export const menuItemClass =
	"relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-callout outline-none transition-colors select-none focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const menuContentClass =
	"z-50 min-w-32 origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border bg-surface p-1 text-ink-1 animate-content-hide data-[expanded]:animate-content-show";

export const menuSeparatorClass = "-mx-1 my-1 h-px bg-surface-2";

export const menuGroupLabelClass = "px-2 py-1.5 text-callout font-semibold";

export const menuShortcutClass =
	"ml-auto text-micro tracking-widest opacity-60";

// ─── Helpers ───

export function isGroupedItems(items: MenuItems): items is MenuGroup[] {
	return (
		items.length > 0 &&
		typeof items[0] === "object" &&
		"items" in items[0] &&
		!("type" in items[0]) &&
		!("label" in items[0] && "onSelect" in items[0])
	);
}
