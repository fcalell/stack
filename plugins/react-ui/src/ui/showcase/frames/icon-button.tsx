import type { IconButtonFit } from "@fcalell/ui-core/variants";
import { IconButton } from "../../components/icon-button/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const act = () => {};

// `ICON_BUTTON.fit.<fit>` draws the act at that fit; `loading` passes `loading`.
export function drawIconButton(frame: ShowcaseFrame) {
	const [cell, axis, value] = frame.cell.name.split(".");
	if (cell !== "ICON_BUTTON" || axis !== "fit") return undefined;
	return (
		<IconButton
			icon="Ellipsis"
			fit={value as IconButtonFit}
			label="More"
			onAct={act}
			loading={frame.state === "loading"}
		/>
	);
}
