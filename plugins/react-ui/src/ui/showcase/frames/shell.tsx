import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import { Banner } from "../../components/banner/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Shell } from "../../components/shell/index.tsx";
import { MarkProvider } from "../../lib/mark.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { MARK } from "./gate.tsx";
import { StandInList } from "./layout-context.tsx";
import { ACTIONS, Column, MORE, Opened } from "./place.tsx";
import { Deployment } from "./screen.tsx";

const act = () => {};

// The selected place is the page the showcase stands on.
function places(): PlaceSpec[] {
	return [
		{ route: "/activity", label: "Activity", icon: "Activity", count: 44 },
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
	options: [
		{ value: "acme", label: "Acme", avatar: {} },
		{ value: "globex", label: "Globex", avatar: {} },
		{ value: "initech", label: "Initech", avatar: {} },
	],
	value: "acme",
	onChange: act,
	act: { label: "New workspace", icon: "Plus", onAct: act },
};

// The banner stands over the page's head, so the frame judges the gap under it.
const BANNER = (
	<Banner
		kind="danger"
		sentence="The last deploy of api failed."
		act={{ label: "Open logs", onAct: act }}
	/>
);

// The app has an icon, so the desktop sidebar heads with its mark.
function Frame() {
	return (
		<Column>
			<MarkProvider mark={MARK}>
				<Shell places={places()} banner={BANNER} switcher={SWITCHER}>
					<Place
						title="Deploys"
						actions={ACTIONS}
						more={MORE}
						act={{ label: "Deploy", onAct: act }}
					>
						<StandInList />
					</Place>
				</Shell>
			</MarkProvider>
		</Column>
	);
}

// The Shell holding a Place, one frame per state on the resting row glyph
// (the sidebar's) and the idle tab (the tab bar's); the body name cell at
// rest draws the switcher's pick open, and on touch the selected tab at rest
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
			<Opened popup="listbox">
				<Frame />
			</Opened>
		);
	return undefined;
}
