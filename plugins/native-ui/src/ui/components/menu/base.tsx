import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { useAct } from "../../lib/act";
import { IconButtonBase } from "../icon-button/base";
import { MenuSheet } from "./sheet";

// The more act named `label` and its sheet titled `title`: a row's menu is
// titled with the row's name. `painted` is the trigger while its data is not
// here: its box filled, inert, so no sheet opens. It holds its items' run, the
// trigger drawn pending while one runs. Outside the package's exports.
export function MenuBase({
	label,
	title,
	items,
	painted,
}: {
	label: string;
	title: string;
	items: readonly MenuItem[];
	painted?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const acting = useAct("toast");
	return (
		<>
			<IconButtonBase
				icon="Ellipsis"
				fit="body"
				label={label}
				open={open}
				painted={painted}
				pending={acting.pending !== undefined}
				onAct={() => setOpen(true)}
			/>
			<MenuSheet
				label={label}
				title={title}
				items={items.map((item) => ({
					...item,
					onAct: () => acting.run(true, item),
				}))}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
