import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { IconButtonBase } from "../icon-button/base";
import { MenuSheet } from "./sheet";

// The more act named `label` and its sheet titled `title`: a row's menu is
// titled with the row's name. Outside the package's exports.
export function MenuBase({
	label,
	title,
	items,
}: {
	label: string;
	title: string;
	items: readonly MenuItem[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<IconButtonBase
				icon="Ellipsis"
				fit="body"
				label={label}
				open={open}
				onAct={() => setOpen(true)}
			/>
			<MenuSheet
				label={label}
				title={title}
				items={items}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
