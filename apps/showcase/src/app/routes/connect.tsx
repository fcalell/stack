import { useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";

export const Route = createFileRoute("/connect")({
	component: Connect,
});

const MARK = { src: "/mark.svg", name: "Acme" };
const EXPIRED =
	"This connection request has expired. Start it again from your client.";

// A page outside the shell, one `Gate`: the first of the two Connect steps.
function Connect() {
	const request = useQuery(orpc.account.request.queryOptions());
	const workspaces = useQuery(orpc.workspaces.list.queryOptions());
	const email = request.data?.email;
	return (
		<Gate
			mark={MARK}
			step={{ at: 1, of: 2 }}
			title="Choose a workspace"
			description={email ? ["Signed in as ", { strong: email }] : undefined}
			banner={
				request.isError ? <Banner kind="warn" sentence={EXPIRED} /> : undefined
			}
		>
			<Group>
				<List
					query={workspaces}
					sentence="Workspaces did not load."
					empty={{ sentence: "No workspace is open to you." }}
					row={{
						key: (item) => item.name,
						title: (item) => item.name,
						meta: (item) => [item.meta],
						leading: { avatar: (item) => ({ name: item.name }) },
						onOpen: act,
					}}
				/>
			</Group>
		</Gate>
	);
}
