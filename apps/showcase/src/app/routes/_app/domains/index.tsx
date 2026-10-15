import { preload } from "@fcalell/plugin-api/tanstack-query";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../../lib/act.ts";
import { orpc } from "../../../lib/api.ts";

export const Route = createFileRoute("/_app/domains/")({
	loader: () => preload(orpc.domains.list.read()),
	component: Domains,
});

// A list of the domains. A row opens nothing: no record route stands behind it.
function Domains() {
	const domains = orpc.domains.list.read();
	return (
		<Place>
			<Pane
				title="Domains"
				actions={[{ icon: "Plus", label: "Add domain", onAct: act }]}
				read={domains}
				failed="Domains did not load."
				empty={{ sentence: "No domain is connected." }}
			>
				<List
					items={domains}
					row={{
						key: (domain) => domain.name,
						leading: { status: (domain) => domain.state },
						title: (domain) => domain.name,
						meta: (domain) => [domain.meta],
						href: (domain) => `#${domain.name}`,
						more: (domain) => [
							...(domain.state === "waiting"
								? [
										{
											label: "Verify",
											icon: "ShieldCheck" as const,
											onAct: () => navigate("/domains/verify"),
										},
									]
								: []),
							{
								label: "Copy name",
								icon: "Copy",
								onAct: () => toast("Name copied"),
							},
						],
					}}
				/>
			</Pane>
		</Place>
	);
}
