import { Screen } from "../../components/screen/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { Column, MORE, Opened } from "./place.tsx";

const act = () => {};
const ACTIONS = [
	{ icon: "Copy" as const, label: "Copy URL", onAct: act },
	{ icon: "ExternalLink" as const, label: "Visit", onAct: act },
];

export function Deployment() {
	return (
		<Screen title="dpl_7Hp9aK" back="#" actions={ACTIONS} more={MORE}>
			<Section title="Properties">
				<StandInRows ground="list" />
			</Section>
		</Screen>
	);
}

// The title cell draws the Screen at rest, the body icon act its more menu
// open. The other cells are the page's constants and the atoms' own.
export function drawScreen(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "TEXT.role.title")
		return (
			<Column>
				<Deployment />
			</Column>
		);
	if (cell === "ICON_BUTTON.fit.body")
		return (
			<Opened>
				<Column>
					<Deployment />
				</Column>
			</Opened>
		);
	return undefined;
}
