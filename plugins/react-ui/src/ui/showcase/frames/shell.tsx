import type {
	GroupSpec,
	OptionPick,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { Banner } from "../../components/banner/index.tsx";
import { Dock } from "../../components/dock/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Shell } from "../../components/shell/index.tsx";
import { MarkProvider } from "../../lib/mark.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { useLoadedTrack } from "./dock.tsx";
import { MARK } from "./gate.tsx";
import { StandInList } from "./layout-context.tsx";
import { ACTIONS, Column, MORE } from "./place.tsx";

const act = () => {};

// The selected place is the page the showcase stands on. It stands under
// Projects, a branch open on the path to it, three levels deep, its middle
// place's long label cut; the boards' folder is folded,
// as a branch the viewer has not opened is. Grouped, the Project and Boards
// places stand in their groups beside the ungrouped ones; ungrouped, in one
// sidebar.
function places(grouped: boolean): PlaceSpec[] {
	return [
		{ route: "/activity", label: "Activity", icon: "Activity", count: 44 },
		{
			route: "/projects",
			label: "Projects",
			icon: "Folder",
			children: [
				{
					route: "/environments",
					label: "Environments of the storefront, production first",
					icon: "Server",
					children: [
						{
							route: location.pathname,
							label: "Deploys",
							icon: "Rocket",
							count: 2,
						},
					],
				},
				{ route: "/domains", label: "Domains", icon: "Globe" },
			],
		},
		{
			route: "/usage",
			label: "Usage",
			icon: "ChartColumn",
			...(grouped && { group: "Project" }),
		},
		{
			route: "/logs/project",
			label: "Logs",
			icon: "Logs",
			...(grouped && { group: "Project" }),
		},
		{
			route: "#teams",
			label: "Teams",
			icon: "Folder",
			...(grouped && { group: "Boards" }),
			children: [
				{ route: "#web", label: "Web", icon: "ListChecks", count: 12 },
			],
		},
		{ route: "/logs", label: "Logs", icon: "Logs" },
		{ route: "/members", label: "Members", icon: "Users" },
		{ route: "/settings", label: "Settings", icon: "Settings", end: true },
	];
}

// A group that carries a switcher: the project's places follow its pick. Every
// group has its entry's icon.
const GROUPS: GroupSpec[] = [
	{
		label: "Project",
		icon: "Package",
		switcher: {
			label: "Projects",
			options: [
				{ value: "web", label: "Storefront", leading: { icon: "Folder" } },
				{ value: "app", label: "Checkout app", leading: { icon: "Folder" } },
			],
			value: "web",
			onChange: act,
			act: { label: "New project", icon: "Plus", onAct: act },
		},
	},
	{ label: "Boards", icon: "ListChecks" },
];

const SWITCHER: OptionPick = {
	label: "Workspaces",
	options: [
		{ value: "acme", label: "Acme", leading: { avatar: { name: "Acme" } } },
		{
			value: "globex",
			label: "Globex",
			leading: { avatar: { name: "Globex" } },
		},
		{
			value: "initech",
			label: "Initech",
			leading: { avatar: { name: "Initech" } },
		},
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
function Frame({ grouped }: { grouped: boolean }) {
	useLoadedTrack({});
	return (
		<Column>
			<MarkProvider mark={MARK}>
				<Shell
					places={places(grouped)}
					groups={grouped ? GROUPS : undefined}
					banner={BANNER}
					switcher={SWITCHER}
					foot={<Dock />}
				>
					<Pane
						acts={[
							{ icon: "Plus" as const, label: "Deploy", onAct: act },
							...ACTIONS,
						]}
						more={MORE}
					>
						<StandInList />
					</Pane>
					<Pane title="dpl_7Hp9aK" record={{}}>
						<StandInList />
					</Pane>
				</Shell>
			</MarkProvider>
		</Column>
	);
}

// The Shell holding a Place, one frame per state on the resting row glyph
// (the rail and the group column, and on touch the places layer's, drawn
// open) and on the selected one the same Shell with no groups (the one
// sidebar); the body name cell at rest draws the switcher's pick open. The
// tab cells are the native shell's and draw no web frame. The other cells are
// drawn inside those frames.
export function drawShell(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "PLACE_ROW_GLYPH.state.rest") return <Frame grouped />;
	if (cell === "PLACE_ROW_GLYPH.state.selected")
		return <Frame grouped={false} />;
	return undefined;
}
