import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { Menu } from "../../components/menu/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { press, Stage } from "./overlay-stage.tsx";

const act = () => {};
const ITEMS: MenuItem[] = [
	{ label: "Copy deploy hook", icon: "Copy", onAct: act },
	{ label: "Export as CSV", icon: "Download", onAct: act },
	{
		label: "Archive previews",
		icon: "Archive",
		onAct: act,
		blocked: "Only owners can archive",
	},
	{
		label: "Delete all previews",
		icon: "Trash2",
		onAct: act,
		destructive: true,
	},
];

// The trigger opens from the pointer (a popover's on its press down, a
// sheet's on its click);
// `highlight` moves the pointer onto the second row.
function opener(highlight: boolean) {
	return (stage: HTMLElement) => {
		const trigger = stage.querySelector<HTMLElement>("button");
		if (trigger?.getAttribute("aria-haspopup") === "menu") {
			trigger.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					pointerType: "mouse",
				}),
			);
			trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		}
		press(trigger);
		if (highlight)
			requestAnimationFrame(() => {
				const second = stage.querySelectorAll('[role="menuitem"]')[1];
				for (const type of ["pointermove", "mousemove"])
					second?.dispatchEvent(
						new PointerEvent(type, { bubbles: true, pointerType: "mouse" }),
					);
			});
	};
}

const OPEN = opener(false);
const HIGHLIGHT = opener(true);

// The trigger alone in each pointer state on its fit cells; the menu open
// on its form cells (the popover on the desktop, the sheet on touch) and,
// on the highlighted row cell, with the keyboard on its second row.
export function drawMenu(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "ICON_BUTTON.fit.bar" || cell === "ICON_BUTTON.fit.body")
		return <Menu label="More" items={ITEMS} />;
	if (frame.state !== "rest") return undefined;
	if (cell === "MENU.form.popover" || cell === "MENU.form.sheet")
		return (
			<Stage contain={frame.density === "touch"} ready={OPEN}>
				<Menu label="More" items={ITEMS} />
			</Stage>
		);
	if (cell === "ROW.state.highlighted")
		return (
			<Stage contain={frame.density === "touch"} ready={HIGHLIGHT}>
				<Menu label="More" items={ITEMS} />
			</Stage>
		);
	return undefined;
}
