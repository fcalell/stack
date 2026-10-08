import type { MenuItem } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed.ts";
import { MenuBase } from "./base.tsx";

/** A menu of acts behind the more act. */
export interface MenuProps extends Closed {
	/** The trigger's accessible name, and the touch sheet's title (a short phrase; read aloud on the trigger, wraps as the sheet's title). */
	label: string;
	/** The acts in order; the destructive ones stand last under a hairline. */
	items: readonly MenuItem[];
}

/** The more act and its acts: on the desktop a popover under the trigger, the keyboard's row under the hover wash; on touch a bottom sheet titled `label` with its close act, taking an act closing it first. A destructive act draws in danger ink, a blocked one inert with its reason under its label. */
export function Menu({ label, items }: MenuProps) {
	return <MenuBase label={label} title={label} items={items} />;
}
