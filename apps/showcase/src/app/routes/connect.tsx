import { preload, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";

export const Route = createFileRoute("/connect")({
	loader: () => preload(orpc.workspaces.list.read()),
	component: Connect,
});

const EXPIRED =
	"This connection request has expired. Start it again from your client.";

// A page outside the shell, one `Gate`: the first of the two Connect steps.
function Connect() {
	const request = useQuery(orpc.account.request.queryOptions());
	const workspaces = orpc.workspaces.list.read();
	return (
		<Gate
			step={{ at: 1, of: 2 }}
			title="Choose a workspace"
			banner={
				request.isError ? <Banner kind="warn" sentence={EXPIRED} /> : undefined
			}
		>
			<Section
				title="Workspaces"
				read={workspaces}
				failed="Workspaces did not load."
				empty={{ sentence: "No workspace is open to you." }}
			>
				<Group
					list={{
						items: workspaces,
						row: {
							key: (item) => item.name,
							title: (item) => item.name,
							meta: (item) => [item.meta],
							leading: { avatar: (item) => ({ name: item.name }) },
							onOpen: act,
						},
					}}
				/>
			</Section>
		</Gate>
	);
}
