import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { act } from "../../lib/act.ts";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/releases")({
	component: Releases,
});

type Stage = "review" | "staging" | "production";

// A Pane that holds no read: the Promote act is blocked by the quota's own
// selection and a stage's description is the count its own read answers, each
// painting, standing blocked or failing in place; the three counts above the
// list are cells that frame their own reads.
function Releases() {
	const [stage, setStage] = useState<Stage | null>(null);
	const [q, setQ] = useState("");
	const quota = orpc.releases.quota.read();
	const stages = orpc.releases.stages.read();
	const shipped = orpc.releases.shipped.read();
	const rolledBack = orpc.releases.rolledBack.read();
	const releases = orpc.releases.list.read(stage ? { stage } : {});
	return (
		<Pane
			acts={[
				{
					icon: "ArrowUpRight",
					label: "Promote",
					blocked: quota.at((q) =>
						q.left === 0 ? "No promotions left this month." : undefined,
					),
					onAct: act,
					done: "Promoted",
				},
			]}
			more={[
				{
					label: "Promote everything in review",
					blocked: quota.at((q) =>
						q.left < 3 ? `Needs 3 promotions, ${q.left} left.` : undefined,
					),
					onAct: act,
				},
			]}
		>
			<Section title="This week">
				<Stats
					items={[
						{
							label: "Shipped",
							value: shipped.at((s) => s.count),
							href: "/deploys",
						},
						{ label: "Rolled back", value: rolledBack.at((s) => s.count) },
						{
							label: "Promotions left",
							value: quota.at((q) => q.left),
							line: "Resets on Oct 31.",
						},
					]}
				/>
			</Section>
			<Toolbar
				search={{ value: q, onChange: setQ, placeholder: "Search releases" }}
				filters={[
					{
						label: "Stage",
						options: ["review", "staging", "production"].map((value) => ({
							value,
							label: value[0]?.toUpperCase() + value.slice(1),
							description: stages.at((all) => {
								const count =
									all.find((one) => one.value === value)?.count ?? 0;
								return `${count} ${count === 1 ? "release" : "releases"}`;
							}),
						})),
						value: stage,
						onChange: (next) => setStage(next as Stage | null),
					},
				]}
			/>
			<Section
				title="Releases"
				items={releases.at((rows) =>
					rows
						.filter((release) =>
							release.name.toLowerCase().includes(q.toLowerCase()),
						)
						.map((release) => ({
							key: release.id,
							title: release.name,
							meta: [release.stage],
							status: { tone: release.state },
						})),
				)}
				empty={{ sentence: "No release in this stage." }}
			/>
		</Pane>
	);
}
