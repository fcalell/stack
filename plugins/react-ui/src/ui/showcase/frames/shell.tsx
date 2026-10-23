import type {
	GroupSpec,
	OptionPick,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { Banner } from "../../components/banner/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Shell } from "../../components/shell/index.tsx";
import { MarkProvider } from "../../lib/mark.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { MARK } from "./gate.tsx";
import { StandInList } from "./layout-context.tsx";
import { ACTIONS, Column, MORE } from "./place.tsx";

const act = () => {};

// The selected place is the page the showcase stands on.
function places(): PlaceSpec[] {
	return [
		{ route: "/activity", label: "Activity", icon: "Activity", count: 44 },
		{ route: location.pathname, label: "Deploys", icon: "Rocket" },
		{ route: "/projects", label: "Projects", icon: "Folder" },
		{ route: "/usage", label: "Usage", icon: "ChartColumn", group: "Project" },
		{ route: "/logs/project", label: "Logs", icon: "Logs", group: "Project" },
		{ route: "/domains", label: "Domains", icon: "Globe" },
		{ route: "/logs", label: "Logs", icon: "Logs" },
		{ route: "/members", label: "Members", icon: "Users" },
		{ route: "/settings", label: "Settings", icon: "Settings" },
	];
}

// A group that carries a switcher: the project's places follow its pick.
const GROUPS: GroupSpec[] = [
	{
		label: "Project",
		switcher: {
			label: "Projects",
			options: [
				{ value: "web", label: "Storefront", icon: "Folder" },
				{ value: "app", label: "Checkout app", icon: "Folder" },
			],
			value: "web",
			onChange: act,
			act: { label: "New project", icon: "Plus", onAct: act },
		},
	},
];

const SWITCHER: OptionPick = {
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
		tone="failed"
		sentence="The last deploy of api failed."
		act={{ label: "Open logs", onAct: act }}
	/>
);

// The app has an icon: the Shell draws it in the switcher's row, the Gate as
// its lockup. The Shell draws the place around the route's Panes: a list Pane
// and the record it opened, a row with a hairline between them.
function Frame() {
	return (
		<Column>
			<MarkProvider mark={MARK}>
				<Shell
					places={places()}
					groups={GROUPS}
					banner={BANNER}
					switcher={SWITCHER}
				>
					<Pane
						title="Deploys"
						actions={[
							{ icon: "Plus" as const, label: "Deploy", onAct: act },
							...ACTIONS,
						]}
						more={MORE}
					>
						<StandInList />
					</Pane>
					<Pane title="dpl_7Hp9aK" back="#">
						<StandInList />
					</Pane>
				</Shell>
			</MarkProvider>
		</Column>
	);
}

// The Shell holding a Place, one frame per state on the resting row glyph
// (the sidebar's, and on touch the places layer's, drawn open); the body
// name cell at rest draws the switcher's pick open. The tab cells are the
// native shell's and draw no web frame. The other cells are drawn inside
// those frames.
export function drawShell(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "PLACE_ROW_GLYPH.state.rest") return <Frame />;
	return undefined;
}
