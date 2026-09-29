import type { Closed } from "#lib/closed.ts";
import { MenuCircle, type MenuItems } from "#lib/menu.tsx";

// A more circle, `label` read aloud, whose acts open anchored under it from
// tablet and as a sheet titled `label` under it: groups under hairlines, a
// destructive act in `danger`, a blocked one disabled with its reason under
// its label. The arrows move through the list, Enter takes an act, Escape
// closes it and focus goes back to the circle; one menu is open at a time.
export type MenuProps = Closed & {
	label: string;
	items: MenuItems;
};

export function Menu(props: MenuProps) {
	return (
		<MenuCircle label={props.label} title={props.label} items={props.items} />
	);
}
