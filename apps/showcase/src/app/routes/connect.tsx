import { preload, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";

export const Route = createFileRoute("/connect")({
	loader: ({ context }) =>
		preload(context.queryClient, orpc.workspaces.list.read()),
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
				request.isError ? (
					<Banner tone="attention" sentence={EXPIRED} />
				) : undefined
			}
		>
			<Section
				title="Workspaces"
				items={workspaces.at((rows) =>
					rows.map((item) => ({
						key: item.name,
						title: item.name,
						meta: [item.meta],
						leading: { avatar: { name: item.name } },
						onOpen: act,
					})),
				)}
				empty={{ sentence: "No workspace is open to you." }}
			/>
		</Gate>
	);
}
