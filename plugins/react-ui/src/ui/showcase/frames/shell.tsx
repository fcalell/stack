import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import { List } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Shell } from "../../components/shell/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { ACTIONS, Column, MORE, Opened } from "./place.tsx";
import { Deployment } from "./screen.tsx";

const act = () => {};

// The selected place is the page the showcase stands on.
function places(): PlaceSpec[] {
	return [
		{ route: "/activity", label: "Activity", icon: "Activity", count: 3 },
		{ route: location.pathname, label: "Deploys", icon: "Rocket" },
		{ route: "/projects", label: "Projects", icon: "Folder" },
		{ route: "/usage", label: "Usage", icon: "ChartColumn" },
		{ route: "/domains", label: "Domains", icon: "Globe" },
		{ route: "/logs", label: "Logs", icon: "Logs" },
		{ route: "/members", label: "Members", icon: "Users" },
		{ route: "/settings", label: "Settings", icon: "Settings" },
	];
}

const SWITCHER: Switcher = {
	label: "Workspaces",
	name: "Acme",
	options: [
		{ label: "Acme", onAct: act },
		{ label: "Globex", onAct: act },
		{ label: "Initech", onAct: act },
	],
	create: { label: "New workspace", icon: "Plus", onAct: act },
};

function Frame() {
	return (
		<Column>
			<Shell places={places()} switcher={SWITCHER}>
				<Place
					title="Deploys"
					actions={ACTIONS}
					more={MORE}
					act={{ label: "Deploy", onAct: act }}
				>
					<List>
						<StandInRows ground="list" />
					</List>
				</Place>
			</Shell>
		</Column>
	);
}

// The Shell holding a Place, one frame per state on the resting row glyph
// (the sidebar's) and the idle tab (the tab bar's); the body name cell at
// rest draws the switcher's menu open, and on touch the selected tab at rest
// the Shell holding a pushed Screen, which covers the tab bar. The other
// cells are drawn inside those frames.
export function drawShell(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const drawn =
		frame.density === "desktop"
			? "PLACE_ROW_GLYPH.state.rest"
			: "PLACE_TAB.state.idle";
	if (cell === drawn) return <Frame />;
	if (
		cell === "PLACE_TAB.state.selected" &&
		frame.state === "rest" &&
		frame.density === "touch"
	)
		return (
			<Column>
				<Shell places={places()} switcher={SWITCHER}>
					<Deployment />
				</Shell>
			</Column>
		);
	if (cell === "TEXT_STRONG.role.body" && frame.state === "rest")
		return (
			<Opened>
				<Frame />
			</Opened>
		);
	return undefined;
}
