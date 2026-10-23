import { useState } from "react";
import type { MenuEntry } from "../../lib/act";
import { asItem, useAct } from "../../lib/act";
import { IconButtonBase } from "../button/glyph";
import { ActSheet } from "../sheet/act";
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
	items: readonly MenuEntry[];
	painted?: boolean;
}) {
	const [open, setOpen] = useState(false);
	// Each item runs under its label, so the sheet that opens is its item's.
	const acting = useAct<string>("toast");
	const sheetOf = (name: string) => {
		const item = items.find((one) => one.label === name);
		return item && "sheet" in item ? item.sheet : undefined;
	};
	return (
		<>
			<IconButtonBase
				icon="Ellipsis"
				label={label}
				open={open}
				painted={painted}
				pending={acting.pending !== undefined}
				onAct={() => setOpen(true)}
			/>
			<MenuSheet
				label={label}
				title={title}
				items={items.map(asItem).map((item) => ({
					...item,
					onAct: () => acting.run(item.label, item),
				}))}
				open={open}
				onClose={() => setOpen(false)}
			/>
			<ActSheet acting={acting} of={sheetOf} />
		</>
	);
}
