import type { IconButtonFit } from "@fcalell/ui-core/variants";
import { IconButtonBase } from "../../components/icon-button/base.tsx";
import { IconButton } from "../../components/icon-button/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

const act = () => {};

// `ICON_BUTTON.fit.<fit>` draws the act at that fit; `loading` passes `loading`;
// `PAINT.kind.control` draws it beside its painted form, the glyph not drawn.
export function drawIconButton(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<IconButton icon="Ellipsis" label="More" onAct={act} />,
			<IconButtonBase icon="Ellipsis" label="More" painted />,
		);
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
