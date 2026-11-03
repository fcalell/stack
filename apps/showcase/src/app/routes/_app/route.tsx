import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { OptionPick, PlaceSpec } from "@fcalell/ui-core/descriptors";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PLAYLIST_TREE, type PlaylistNode } from "../../fixtures/library.ts";
import { act } from "../../lib/act.ts";
import { addToPlaylist, useCrate } from "../../lib/library.ts";

export const Route = createFileRoute("/_app")({
	component: App,
});

const PLACES: PlaceSpec[] = [
	{ label: "Activity", icon: "Activity", count: 3, route: "#activity" },
	{ label: "Deploys", icon: "Rocket", route: "/deploys" },
	{ label: "Projects", icon: "Folder", route: "/projects" },
	{ label: "Usage", icon: "ChartColumn", route: "/usage" },
	{ label: "Domains", icon: "Globe", route: "/domains" },
	{ label: "Logs", icon: "Logs", route: "/logs" },
	{ label: "Requests", icon: "Activity", route: "/requests" },
	{ label: "Library", icon: "Music", route: "/library" },
	{ label: "Assistant", icon: "Sparkles", route: "/assistant" },
	{ label: "Members", icon: "Users", route: "/members" },
	{ label: "Settings", icon: "Settings", route: "/settings" },
	{ label: "Home", icon: "House", route: "/home" },
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

// The playlists are places in folders: a leaf takes a dragged track, with the
// count of what it holds, and the library's tracks drag onto them. A folder is
// a place that only opens and folds (its route is a spot).
function App() {
	const crate = useCrate();
	const place = (node: PlaylistNode): PlaceSpec => {
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
			icon: "ListMusic",
			route: `#${node.id}`,
			count: crate.playlists[node.id]?.length ?? 0,
			drop: {
				accepts: "track",
				label: `Add to ${node.label}`,
				onDrop: (drag) => addToPlaylist(node.id, drag.picked),
				done: `Added to ${node.label}`,
			},
		};
	};
	const playlists: PlaceSpec[] = PLAYLIST_TREE.map((node) => ({
		...place(node),
		group: "Playlists",
	}));
	return (
		<Shell places={[...PLACES, ...playlists]} switcher={SWITCHER}>
			<Outlet />
		</Shell>
	);
}
