import { useQuery } from "@fcalell/plugin-api/tanstack-query";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../../lib/act.ts";
import { orpc } from "../../../lib/api.ts";

export const Route = createFileRoute("/_app/domains/")({
	component: Domains,
});

// A list with nothing open.
function Domains() {
	const domains = useQuery(orpc.domains.list.queryOptions());
	return (
		<Place title="Domains" act={{ label: "Add domain", onAct: act }} bleed>
			<Split
				list={
					<List
						query={domains}
						sentence="Domains did not load."
						empty={{ sentence: "No domain is connected." }}
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
				}
				empty={
					<EmptyState
						icon="Globe"
						title="No domain open"
						sentence="Pick a domain from the list to read its records."
					/>
				}
			/>
		</Place>
	);
}
