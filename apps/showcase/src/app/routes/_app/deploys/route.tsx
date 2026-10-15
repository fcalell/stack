import { preload } from "@fcalell/plugin-api/tanstack-query";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DeployList, deploysPage } from "../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys")({
	loader: () => preload(deploysPage()),
	component: DeploysPlace,
});

// The Deploys place: the list is its first Pane at every route, and the
// deploy and its step open as the Panes after it.
function DeploysPlace() {
	return (
		<Place>
			<DeployList />
			<Outlet />
		</Place>
	);
}
