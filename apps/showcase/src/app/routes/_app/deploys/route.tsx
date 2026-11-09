import { preload } from "@fcalell/plugin-api/tanstack-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DeployList, deploysPage } from "../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys")({
	loader: ({ context }) => preload(context.queryClient, deploysPage()),
	component: DeploysPlace,
});

// The Deploys place: the list is its Pane at every route, and the deploy opens
// as the record's Pane after it, its step a part of that Pane's body.
function DeploysPlace() {
	return (
		<>
			<DeployList />
			<Outlet />
		</>
	);
}
