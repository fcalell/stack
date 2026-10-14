import {
	type Datum,
	type Selection,
	useMutation,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import {
	type Fact,
	ItemHeader,
} from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { age } from "@fcalell/plugin-react-ui/lib/age";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type {
	Act,
	ChipMark,
	IconAct,
	MenuItem,
	Option,
} from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { useState } from "react";
import type { AppRouter } from "../../../.stack/worker";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";
import { DeployChanges } from "./deploy-changes.tsx";

type Deploys = AppRouter["deploys"];
type Deploy = Deploys["list"]["__output"][number];
type OpenDeploy = Deploys["get"]["__output"];

const ENVIRONMENTS: Record<Deploy["environment"], ChipMark> = {
	production: { family: "teal", label: "Production" },
	preview: { family: "violet", label: "Preview" },
};

const LABELS: Record<StatusState, string> = {
	active: "Building",
	running: "Deploying",
	waiting: "Waiting",
	done: "Ready",
	attention: "Slow",
	failed: "Failed",
	idle: "Stopped",
};

const STATES: Option<StatusState>[] = (
	["waiting", "active", "done", "failed"] as const
).map((state) => ({ value: state, label: LABELS[state], status: state }));

function moreOf(deploy: Deploy): MenuItem[] {
	const redeploy = {
		label: "Redeploy",
		icon: "RotateCw",
		onAct: () => toast(`Redeploying ${deploy.commit}`, { state: "done" }),
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

function DeployRows(props: { deploys: Datum<readonly Deploy[]> }) {
	return (
		<List
			items={props.deploys}
			row={{
				key: (deploy) => deploy.id,
				// Every row leads with who started it; its state's word is a mark on the
				// meta line, after the commit that names the deploy (the branch cut
				// first).
				leading: { avatar: (deploy) => ({ name: deploy.author }) },
				title: (deploy) => deploy.message,
				meta: (deploy) => [deploy.commit, deploy.branch],
				trailing: (deploy) => ({ age: deploy.age }),
				status: (deploy) => ({
					state: deploy.state,
					label: LABELS[deploy.state],
				}),
				chip: (deploy) => ENVIRONMENTS[deploy.environment],
				more: moreOf,
				// The open record's row is current at its route and below it.
				href: (deploy) => `/deploys/${deploy.id}`,
			}}
		/>
	);
}

// The open deploy's body: its place and facts, its sections, what it waits on.
// The status the viewer picks is the app's own edit over the record's state.
function Record(props: {
	deploy: Selection<OpenDeploy>;
	deployId: string;
	file?: string;
}) {
	const { deploy } = props;
	const [picked, setPicked] = useState<StatusState>();
	const [cancelled, setCancelled] = useState(false);
	const [until] = useState(() => new Date(Date.now() + 90_000));
	// What the conditional parts below the sections stand on, once it lands.
	const open = useRead(deploy);
	const redeploying = open?.state === "active" && !cancelled;
	const stateOf = (each: OpenDeploy) => picked ?? each.state;
	const steps = deploy.at((each) => each.steps);
	return (
		<>
			<ItemHeader
				overline={[
					"acme-web",
					deploy.at((each) => ENVIRONMENTS[each.environment].label),
				]}
				facts={[
					deploy.at(
						(each): Fact<StatusState> => ({
							pick: {
								label: "Status",
								options: STATES,
								value: stateOf(each),
								onChange: setPicked,
							},
						}),
					),
					deploy.at((each) => each.author),
					deploy.at((each) => age(each.age)),
					{ count: 3, label: "Checks" },
				]}
			/>
			<Section title="Summary">
				<Group
					items={[
						{
							key: "commit",
							row: (
								<DefinitionRow
									label="Commit"
									value={deploy.at((each) => each.commit)}
									copyable
								/>
							),
						},
						{
							key: "branch",
							row: (
								<DefinitionRow
									label="Branch"
									value={deploy.at((each) => each.branch)}
									href={`#${open?.branch ?? ""}`}
								/>
							),
						},
						{
							key: "region",
							row: (
								<DefinitionRow
									label="Region"
									value="Frankfurt, eu-central-1"
									act={{ icon: "Pencil", label: "Change region", onAct: act }}
								/>
							),
						},
						{
							key: "status",
							row: (
								<DefinitionRow
									label="Status"
									value={deploy.at((each) => ({
										status: stateOf(each),
										label: LABELS[stateOf(each)],
									}))}
								/>
							),
						},
						{
							key: "duration",
							row: <DefinitionRow label="Duration" value="1 min 42 s" />,
						},
					]}
				/>
			</Section>
			<Section title="Domains" count={2}>
				<Group
					items={[
						{
							key: "acme-dev",
							row: (
								<DefinitionRow
									label="acme.dev"
									value="Primary"
									href="#acme.dev"
								/>
							),
						},
						{
							key: "www-acme-dev",
							row: (
								<DefinitionRow
									label="www.acme.dev"
									value="Redirect"
									href="#www.acme.dev"
								/>
							),
						},
					]}
				/>
			</Section>
			<Section title="Steps" read={steps}>
				<StepRows deployId={props.deployId} steps={steps} />
			</Section>
			{open?.state === "failed" ? (
				<Banner
					kind="danger"
					sentence="The build failed at Install: wrangler 4.12 needs Node 20."
					act={{ label: "Open logs", onAct: act }}
				/>
			) : null}
			{open && redeploying ? (
				<>
					<Banner sentence="The previous deploy serves traffic until this one is ready." />
					<PendingBar
						sentence={`Deploying ${open.commit} from ${open.branch}`}
						until={until}
						act={{
							label: "Cancel",
							onAct: () => {
								setCancelled(true);
								toast("Deploy cancelled", { state: "attention" });
							},
						}}
					/>
				</>
			) : null}
			<DeployChanges
				deploy={deploy}
				deployId={props.deployId}
				file={props.file}
			/>
		</>
	);
}

// The deploy's steps; the open one's row is current at its route.
function StepRows(props: {
	deployId: string;
	steps: Selection<OpenDeploy["steps"]>;
}) {
	return (
		<List
			items={props.steps}
			row={{
				key: (each) => each.id,
				title: (each) => each.name,
				meta: (each) => [each.took],
				status: (each) => ({ state: each.state, label: LABELS[each.state] }),
				href: (each) => `/deploys/${props.deployId}/steps/${each.id}`,
			}}
		/>
	);
}

// A step the deploy opened, the Pane after the deploy: its Close returns to
// the deploy's route. The deploy's own Pane holds the read; this one holds the
// step as a selection of it, so a step that is gone draws the empty form.
export function DeployStep(props: { deployId: string; stepId: string }) {
	const deploy = orpc.deploys.get.read({ id: props.deployId });
	const step = deploy.at((each) =>
		each.steps.find((one) => one.id === props.stepId),
	);
	// The body stands only once the step is here.
	const found = step.at((one) => one as OpenDeploy["steps"][number]);
	return (
		<Pane
			key={props.stepId}
			read={step}
			title={step.at((one) => one?.name ?? "")}
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
			<Section title="Result">
				<Group
					items={[
						{
							key: "status",
							row: (
								<DefinitionRow
									label="Status"
									value={found.at((one) => ({
										status: one.state,
										label: LABELS[one.state],
									}))}
								/>
							),
						},
						{
							key: "duration",
							row: (
								<DefinitionRow
									label="Duration"
									value={found.at((one) => one.took)}
								/>
							),
						},
						{
							key: "deploy",
							row: (
								<DefinitionRow
									label="Deploy"
									value={deploy.at((each) => each.commit)}
									copyable
								/>
							),
						},
					]}
				/>
			</Section>
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
			<Section title="About">
				<Group
					items={[
						{
							key: "author",
							row: (
								<DefinitionRow
									label="Author"
									value={deploy.at((each) => each.author)}
								/>
							),
						},
						{
							key: "started",
							row: <DefinitionRow label="Started" value="10:42" />,
						},
						{
							key: "deploy-id",
							row: (
								<DefinitionRow
									label="Deploy ID"
									value={deploy.at((each) => `dpl_${each.id}9q2m`)}
									copyable
								/>
							),
						},
					]}
				/>
			</Section>
			<Section
				title="Removal"
				description="Deleting this deploy takes its URL offline and removes its build output."
				act={deploy.at(
					(each): Act => ({
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
	const deploys = orpc.deploys.list.read();
	const removePreviews = useMutation(
		orpc.deploys.removePreviews.mutationOptions(),
	);
	return (
		<Pane
			title="Deploys"
			read={deploys}
			failed="Deploys did not load."
			empty={{ sentence: "No deploy has run on this project." }}
			actions={[
				{
					icon: "Plus",
					label: "Deploy",
					onAct: () =>
						toast("Deploy started", {
							state: "done",
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
									toast("Previews deleted", { state: "done" });
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
					fit="bar"
					icon="ListFilter"
					label="Filter"
					count={2}
					onAct={act}
				/>
				<Button
					act="secondary"
					fit="bar"
					icon="ArrowUpDown"
					label="Sort"
					onAct={act}
				/>
				<IconButton
					fit="bar"
					icon="SlidersHorizontal"
					label="Display"
					onAct={act}
				/>
			</Toolbar>
			<DeployRows deploys={deploys} />
		</Pane>
	);
}

// The deploy opened beside the list, read by its id: the Pane holds the read,
// so an address after its removal draws the missing form. Its Close returns to
// the list.
export function DeployRecord(props: { deployId: string; file?: string }) {
	const deploy = orpc.deploys.get.read({ id: props.deployId });
	return (
		<Pane
			read={deploy}
			title={deploy.at((each) => each.message)}
			failed="The deploy did not load."
			back="/deploys"
		>
			<Record
				key={props.deployId}
				deploy={deploy}
				deployId={props.deployId}
				file={props.file}
			/>
			<DeployDetails deploy={deploy} />
		</Pane>
	);
}
