import type { Closed } from "../../lib/closed";
import { MenuCircle, type MenuItems } from "../../lib/more";

export interface MenuProps extends Closed {
	label: string;
	items: MenuItems;
}

// A more circle, `label` read aloud, whose acts open as a sheet titled
// `label`: groups under hairlines, a destructive act in `danger`, a blocked
// one faded with its reason under it. The sheet is the phone's menu; one
// sheet is open at a time.
export function Menu({ label, items }: MenuProps) {
	return <MenuCircle label={label} title={label} items={items} />;
}
