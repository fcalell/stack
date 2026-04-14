import type { MenuGroup, MenuItems } from "#components/dropdown-menu";

// ─── Shared style constants ───

export const menuItemClass =
	"relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const menuContentClass =
	"z-50 min-w-32 origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground animate-content-hide data-[expanded]:animate-content-show";

export const menuSeparatorClass = "-mx-1 my-1 h-px bg-muted";

export const menuGroupLabelClass = "px-2 py-1.5 text-sm font-semibold";

export const menuShortcutClass = "ml-auto text-xs tracking-widest opacity-60";

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
