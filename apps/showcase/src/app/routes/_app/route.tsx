import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { OptionPick, PlaceSpec } from "@fcalell/ui-core/descriptors";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BOARD_TREE, type BoardNode } from "../../fixtures/tasks.ts";
import { act } from "../../lib/act.ts";
import { addToBoard, useWork } from "../../lib/tasks.ts";

export const Route = createFileRoute("/_app")({
	component: App,
});

// Projects is a branch: its places stand one level in, and Logs holds Requests
// a level deeper, so a screen of any of them draws the branch open on its path
// (a count on a leaf, a long label that truncates, three levels deep).
const PLACES: PlaceSpec[] = [
	{ label: "Activity", icon: "Activity", count: 3, route: "#activity" },
	{
		label: "Projects",
		icon: "Folder",
		route: "/projects",
		children: [
			{ label: "Deploys", icon: "Rocket", route: "/deploys", count: 2 },
			{ label: "Usage", icon: "ChartColumn", route: "/usage" },
			{ label: "Domains", icon: "Globe", route: "/domains" },
			{
				label: "Logs from every environment of the storefront",
				icon: "Logs",
				route: "/logs",
				children: [
					{
						label: "Requests",
						icon: "Activity",
						route: "/requests",
						count: 12,
					},
				],
			},
		],
	},
	{ label: "Tasks", icon: "ListTodo", route: "/tasks" },
	{ label: "Keys", icon: "KeyRound", route: "/keys" },
	{ label: "Releases", icon: "Rocket", route: "/releases" },
	{ label: "Activity", icon: "ChartColumn", route: "/activity" },
	{ label: "Sprints", icon: "Archive", route: "/sprints" },
	{ label: "Assistant", icon: "Sparkles", route: "/assistant" },
	{ label: "Members", icon: "Users", route: "/members" },
	{ label: "Settings", icon: "Settings", route: "/settings" },
	{ label: "Home", icon: "House", route: "/home" },
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

// The boards are places in folders: a leaf takes a dragged task, with the
// count of what it holds, and the tasks of the table drag onto them. A folder is
// a place that only opens and folds (its route is a spot).
function App() {
	const work = useWork();
	const place = (node: BoardNode): PlaceSpec => {
		if (node.folder) {
			const children = node.folder.map(place);
			return {
				label: node.label,
				icon: "Folder",
				route: `#${node.id}`,
				children,
			};
		}
		return {
			label: node.label,
			icon: "ListChecks",
			route: `#${node.id}`,
			count: work.boards[node.id]?.length ?? 0,
			drop: {
				accepts: "task",
				label: `Add to ${node.label}`,
				onDrop: (drag) => addToBoard(node.id, drag.picked),
				done: `Added to ${node.label}`,
			},
		};
	};
	const boards: PlaceSpec[] = BOARD_TREE.map((node) => ({
		...place(node),
		group: "Boards",
	}));
	return (
		<Shell places={[...PLACES, ...boards]} switcher={SWITCHER}>
			<Outlet />
		</Shell>
	);
}
