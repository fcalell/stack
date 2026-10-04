import type { MenuItem } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { MenuBase } from "./base";

export interface MenuProps extends Closed {
	// The more act's name, read aloud, and the sheet's title.
	label: string;
	// The acts in order; the destructive ones stand last under a hairline.
	items: readonly MenuItem[];
}

// The more act and its acts: the phone's menu is a bottom sheet titled
// `label` with its close act, the trigger holding the press wash while it is
// open. A destructive act draws in danger ink, a blocked one inert with its
// reason under its label.
export function Menu({ label, items }: MenuProps) {
	return <MenuBase label={label} title={label} items={items} />;
}
