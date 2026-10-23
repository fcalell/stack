import {
	type Selection,
	useMutation,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import type { Fact } from "@fcalell/plugin-react-ui/components/pane";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { age } from "@fcalell/plugin-react-ui/lib/age";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type {
	Act,
	ChipMark,
	IconAct,
	Option,
} from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import { useState } from "react";
import type { AppRouter } from "../../../.stack/worker";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";
import { DeployChanges } from "./deploy-changes.tsx";

type Deploys = AppRouter["deploys"];
type Deploy = Deploys["list"]["__output"]["data"][number];
type OpenDeploy = Deploys["get"]["__output"];

// Deploys a page holds: the list pages in fives, behind "Show more".
const PAGE = 5;

// The reads of the Deploys place, built here so a route's loader and the
// component that draws them name one key.
export const deploysPage = () => orpc.deploys.list.pages({ limit: PAGE });
export const deployRead = (id: string) => orpc.deploys.get.read({ id });

const ENVIRONMENTS: Record<Deploy["environment"], ChipMark> = {
	production: { family: "teal", label: "Production" },
	preview: { family: "violet", label: "Preview" },
};

const LABELS: Record<Tone, string> = {
	active: "Building",
	running: "Deploying",
	waiting: "Waiting",
	done: "Ready",
	attention: "Slow",
	failed: "Failed",
	idle: "Stopped",
};

const STATES: Option<Tone>[] = (
	["waiting", "active", "done", "failed"] as const
).map((state) => ({ value: state, label: LABELS[state], status: state }));

function moreOf(deploy: Deploy): Act[] {
	const redeploy = {
		label: "Redeploy",
		icon: "RotateCw",
		onAct: () => toast(`Redeploying ${deploy.commit}`),
	} as const;
	const copy = {
		label: "Copy URL",
		icon: "Copy",
		onAct: () => toast("URL copied"),
	} as const;
	// The act a waiting deploy waits on leads its menu.
	return deploy.state === "waiting"
		? [
				{
					label: "Retry",
					icon: "RefreshCw",
					onAct: () => toast(`Retrying ${deploy.commit}`),
				},
				redeploy,
				copy,
			]
		: [redeploy, copy];
}

// A deploy as a row. Every row leads with who started it; its state's word is a
// mark on the meta line, after the commit that names the deploy (the branch cut
// first).
const toDeployRow = (deploy: Deploy): Row => ({
	key: deploy.id,
	leading: { avatar: { name: deploy.author } },
	title: deploy.message,
	meta: [deploy.commit, deploy.branch],
	trailing: { age: deploy.age },
	// A failed deploy says why in place of its state: its warning is the first mark.
	status:
		deploy.state === "failed"
			? undefined
			: { tone: deploy.state, label: LABELS[deploy.state] },
	chip: ENVIRONMENTS[deploy.environment],
	warning:
		deploy.state === "failed"
			? "Its pinned wrangler names a flag the lockfile no longer holds"
			: undefined,
	more: moreOf(deploy),
	// The open record's row is current at its route and below it.
	href: `/deploys/${deploy.id}`,
});

function DeployRows(props: { deploys: Selection<readonly Deploy[]> }) {
	return <Section items={props.deploys.at((rows) => rows.map(toDeployRow))} />;
}

// The open deploy's body: what it waits on, then its sections. What it waits
// on stands only with the data, above the sections: the shift check reports
// what its arrival moves. The status the viewer picks is the app's own edit
// over the record's state.
function Record(props: {
	deploy: Selection<OpenDeploy>;
	deployId: string;
	picked?: Tone;
	file?: string;
}) {
	const { deploy, picked } = props;
	const [cancelled, setCancelled] = useState(false);
	const [until] = useState(() => new Date(Date.now() + 90_000));
	// What the conditional parts above the sections stand on, once it lands.
	const open = useRead(deploy);
	const redeploying = open?.state === "active" && !cancelled;
	const stateOf = (each: OpenDeploy) => picked ?? each.state;
	const steps = deploy.at((each) => each.steps);
	return (
		<>
			{open?.state === "failed" ? (
				<Banner
					tone="failed"
					sentence="The build failed at Install: wrangler 4.12 needs Node 20."
					act={{ label: "Open logs", onAct: act }}
				/>
			) : null}
			{open && redeploying ? (
				<>
					<Banner sentence="The previous deploy serves traffic until this one is ready." />
					<Banner
						tone="running"
						sentence={`Deploying ${open.commit} from ${open.branch}`}
						until={until}
						act={{
							label: "Cancel",
							onAct: () => {
								setCancelled(true);
								toast("Deploy cancelled", { tone: "attention" });
							},
						}}
					/>
				</>
			) : null}
			<Section
				title="Summary"
				items={[
					{
						label: "Commit",
						title: deploy.at((each) => ({
							code: each.commit,
							copy: true as const,
						})),
					},
					{
						label: "Branch",
						title: deploy.at((each) => each.branch),
						href: `#${open?.branch ?? ""}`,
					},
					{
						label: "Region",
						title: "Frankfurt, eu-central-1",
						act: { icon: "Pencil", label: "Change region", onAct: act },
					},
					{
						label: "Status",
						title: deploy.at((each) => ({
							status: stateOf(each),
							label: LABELS[stateOf(each)],
						})),
					},
					{ label: "Duration", title: "1 min 42 s" },
				]}
			/>
			<Section
				title="Domains"
				items={[
					{ label: "acme.dev", title: "Primary", href: "#acme.dev" },
					{ label: "www.acme.dev", title: "Redirect", href: "#www.acme.dev" },
				]}
			/>
			<Section
				title="Steps"
				items={steps.at((rows) =>
					rows.map((each) => ({
						key: each.id,
						title: each.name,
						meta: [each.took],
						status: { tone: each.state, label: LABELS[each.state] },
						href: `/deploys/${props.deployId}/steps/${each.id}`,
					})),
				)}
			/>
			<DeployChanges
				deploy={deploy}
				deployId={props.deployId}
				file={props.file}
			/>
		</>
	);
}

// A step the deploy opened, the Pane after the deploy: its Close returns to
// the deploy's route. The deploy's own Pane holds the read; this one holds the
// step as a selection of it, so a step that is gone draws the empty form.
export function DeployStep(props: { deployId: string; stepId: string }) {
	const deploy = deployRead(props.deployId);
	const step = deploy.at((each) =>
		each.steps.find((one) => one.id === props.stepId),
	);
	// The Pane draws its empty form for a step that is gone, but the body's
	// selectors still run over it: they get an empty step, never `undefined`,
	// since a selector that throws over real data holds its Pane busy.
	const found = step.at((one) => one ?? ({} as OpenDeploy["steps"][number]));
	return (
		<Pane
			key={props.stepId}
			read={step}
			title={step.at((one) => one?.name ?? props.stepId)}
			back={`/deploys/${props.deployId}`}
			actions={[
				step.at(
					(one): IconAct => ({
						icon: "RotateCw",
						label: "Rerun",
						onAct: () => toast(`Rerunning ${one?.name}`),
					}),
				),
			]}
		>
			<Section
				title="Result"
				items={[
					{
						label: "Status",
						title: found.at((one) => ({
							status: one.state,
							label: LABELS[one.state],
						})),
					},
					{ label: "Duration", title: found.at((one) => one.took) },
					{
						label: "Deploy",
						title: deploy.at((each) => ({
							code: each.commit,
							copy: true as const,
						})),
					},
				]}
			/>
			<Section title="Log">
				<Code text={found.at((one) => one.log)} copy />
			</Section>
		</Pane>
	);
}

// The open deploy's details, sections of the deploy's own Pane.
function DeployDetails(props: { deploy: Selection<OpenDeploy> }) {
	const { deploy } = props;
	const remove = useMutation(orpc.deploys.remove.mutationOptions());
	return (
		<>
			<Section
				title="About"
				items={[
					{ label: "Author", title: deploy.at((each) => each.author) },
					{ label: "Started", title: "10:42" },
					{
						label: "Deploy ID",
						title: deploy.at((each) => ({
							code: `dpl_${each.id}9q2m`,
							copy: true as const,
						})),
					},
				]}
			/>
			<Section
				title="Removal"
				description="Deleting this deploy takes its URL offline and removes its build output."
				act={deploy.at(
					(each): IconAct => ({
						icon: "Trash2",
						label: "Delete deploy",
						destructive: true,
						onAct: () =>
							confirm({
								title: `Delete ${each.commit}?`,
								sentence:
									"Its URL goes offline and its build output is removed. This cannot be undone.",
								act: {
									label: "Delete deploy",
									destructive: true,
									onAct: async () => {
										await remove.mutateAsync({ id: each.id });
										navigate("/deploys");
									},
								},
								confirmName: {
									value: each.commit,
									label: `Type ${each.commit} to confirm`,
									blocked: "Type the commit to delete its deploy.",
								},
							}),
					}),
				)}
			/>
		</>
	);
}

// The Deploys place's first Pane: the deploys, a row opening one beside it.
export function DeployList() {
	const queryClient = useQueryClient();
	const deploys = deploysPage();
	const removePreviews = useMutation(
		orpc.deploys.removePreviews.mutationOptions(),
	);
	return (
		<Pane
			title="Deploys"
			read={deploys}
			empty={{ sentence: "No deploy has run on this project." }}
			actions={[
				{
					icon: "Plus",
					label: "Deploy",
					onAct: () =>
						toast("Deploy started", {
							act: { label: "View", onAct: act },
						}),
				},
				{
					icon: "RefreshCw",
					label: "Refresh",
					onAct: () =>
						queryClient.invalidateQueries({
							queryKey: deploys.options.queryKey,
						}),
				},
			]}
			more={[
				{ label: "Copy deploy hook", onAct: () => toast("Deploy hook copied") },
				{ label: "Export as CSV", onAct: act },
				{
					label: "Delete all previews",
					destructive: true,
					onAct: () =>
						confirm({
							title: "Delete all previews?",
							sentence: "Their URLs go offline. Production deploys stay.",
							act: {
								label: "Delete previews",
								destructive: true,
								onAct: async () => {
									await removePreviews.mutateAsync();
									toast("Previews deleted");
								},
							},
						}),
				},
			]}
		>
			<Toolbar
				search={{ value: "", onChange: act }}
				chips={[
					{ family: "neutral", label: "Branch: main", onRemove: act },
					{ family: "neutral", label: "Author: Ana Ruiz", onRemove: act },
				]}
			>
				<Button
					act="secondary"
					icon="ListFilter"
					label="Filter"
					count={2}
					onAct={act}
				/>
				<Button act="secondary" icon="ArrowUpDown" label="Sort" onAct={act} />
				<Button glyph icon="SlidersHorizontal" label="Display" onAct={act} />
			</Toolbar>
			<DeployRows deploys={deploys} />
		</Pane>
	);
}

// The deploy opened beside the list, read by its id: the Pane holds the read,
// so an address after its removal draws the missing form. The bar holds where
// the deploy lives and its Close returns to the list; the deploy's message
// stands whole in its head. The route keys it by the deploy, so the status
// picked is the open deploy's.
export function DeployRecord(props: { deployId: string; file?: string }) {
	const deploy = deployRead(props.deployId);
	const [picked, setPicked] = useState<Tone>();
	return (
		<Pane
			read={deploy}
			title={deploy.at((each) => each.message)}
			record={{
				within: "Deploys",
				overline: [
					"acme-web",
					deploy.at((each) => ENVIRONMENTS[each.environment]?.label),
				],
				facts: [
					deploy.at(
						(each): Fact<Tone> => ({
							pick: {
								label: "Status",
								options: STATES,
								value: picked ?? each.state,
								onChange: setPicked,
							},
						}),
					),
					deploy.at((each) => age(each.age)),
					// A money value in the head's facts draws as figures.
					"$0.86",
				],
			}}
			back="/deploys"
		>
			<Record
				deploy={deploy}
				deployId={props.deployId}
				picked={picked}
				file={props.file}
			/>
			<DeployDetails deploy={deploy} />
		</Pane>
	);
}
