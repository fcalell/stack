import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";

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
	{ label: "Assistant", icon: "Sparkles", route: "/assistant" },
	{ label: "Members", icon: "Users", route: "/members" },
	{ label: "Settings", icon: "Settings", route: "/settings" },
	{ label: "Home", icon: "House", route: "/home" },
];

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

function App() {
	return (
		<Shell places={PLACES} switcher={SWITCHER}>
			<Outlet />
		</Shell>
	);
}
