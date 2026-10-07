import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import {
	QueryBoundary,
	type QueryLike,
} from "@fcalell/plugin-react-ui/components/query-boundary";
import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { age } from "@fcalell/plugin-react-ui/lib/age";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type { ChipMark, MenuItem, Option } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { skipToken } from "@tanstack/react-query";
import { useState } from "react";
import type { AppRouter } from "../../../.stack/worker";
import { act } from "../lib/act.ts";
import { orpc } from "../lib/api.ts";
import { DeployChanges } from "./deploy-changes.tsx";

type Deploys = AppRouter["deploys"];
type Deploy = Deploys["list"]["__output"][number];
type OpenDeploy = Deploys["get"]["__output"];
type Step = OpenDeploy["steps"][number];

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

function DeployRows(props: { query: QueryLike<Deploy[]> }) {
	return (
		<List
			query={props.query}
			sentence="Deploys did not load."
			empty={{ sentence: "No deploy has run on this project." }}
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

// The open deploy: its head, what it waits on, its facts.
function Record(props: { deploy: OpenDeploy; file?: string }) {
	const { deploy } = props;
	const [state, setState] = useState(deploy.state);
	const [redeploying, setRedeploying] = useState(deploy.state === "active");
	const [until] = useState(() => new Date(Date.now() + 90_000));
	return (
		<>
			<ItemHeader
				overline={["acme-web", ENVIRONMENTS[deploy.environment].label]}
				title={deploy.message}
				facts={[
					{
						pick: {
							label: "Status",
							options: STATES,
							value: state,
							onChange: setState,
						},
					},
					deploy.author,
					age(deploy.age),
					{ count: 3, label: "Checks" },
				]}
			/>
			{deploy.state === "failed" ? (
				<Banner
					kind="danger"
					sentence="The build failed at Install: wrangler 4.12 needs Node 20."
					act={{ label: "Open logs", onAct: act }}
				/>
			) : null}
			{redeploying ? (
				<>
					<Banner sentence="The previous deploy serves traffic until this one is ready." />
					<PendingBar
						sentence={`Deploying ${deploy.commit} from ${deploy.branch}`}
						until={until}
						act={{
							label: "Cancel",
							onAct: () => {
								setRedeploying(false);
								toast("Deploy cancelled", { state: "attention" });
							},
						}}
					/>
				</>
			) : null}
			<Section title="Summary">
				<Group>
					<DefinitionRow label="Commit" value={deploy.commit} copyable />
					<DefinitionRow
						label="Branch"
						value={deploy.branch}
						href={`#${deploy.branch}`}
					/>
					<DefinitionRow
						label="Region"
						value="Frankfurt, eu-central-1"
						act={{ icon: "Pencil", label: "Change region", onAct: act }}
					/>
					<DefinitionRow
						label="Status"
						value={{ status: state, label: LABELS[state] }}
					/>
					<DefinitionRow label="Duration" value="1 min 42 s" />
				</Group>
			</Section>
			<Section title="Domains" count={2}>
				<Group>
					<DefinitionRow label="acme.dev" value="Primary" href="#acme.dev" />
					<DefinitionRow
						label="www.acme.dev"
						value="Redirect"
						href="#www.acme.dev"
					/>
				</Group>
			</Section>
			<Section title="Steps" count={deploy.steps.length}>
				<StepRows deploy={deploy} />
			</Section>
			<DeployChanges deploy={deploy} file={props.file} />
		</>
	);
}

// The deploy's steps; the open one's row is current at its route.
function StepRows(props: { deploy: OpenDeploy }) {
	return (
		<List
			items={props.deploy.steps}
			row={{
				key: (each) => each.id,
				title: (each) => each.name,
				meta: (each) => [each.took],
				status: (each) => ({ state: each.state, label: LABELS[each.state] }),
				href: (each) => `/deploys/${props.deploy.id}/steps/${each.id}`,
			}}
		/>
	);
}

// A step the deploy opened, beside it from `wide`: a Screen whose back is the
// deploy's route.
function StepScreen(props: { deploy: OpenDeploy; step: Step }) {
	const { deploy, step } = props;
	return (
		<Screen
			title={step.name}
			back={`/deploys/${deploy.id}`}
			actions={[
				{
					icon: "RotateCw",
					label: "Rerun",
					onAct: () => toast(`Rerunning ${step.name}`),
				},
			]}
		>
			<Section title="Summary">
				<Group>
					<DefinitionRow
						label="Status"
						value={{ status: step.state, label: LABELS[step.state] }}
					/>
					<DefinitionRow label="Duration" value={step.took} />
					<DefinitionRow label="Deploy" value={deploy.commit} copyable />
				</Group>
			</Section>
			<Section title="Log">
				<Code text={step.log} copy />
			</Section>
		</Screen>
	);
}

// The open deploy's details, the Split's pane (a sheet below `wide`).
function Details(props: { deploy: OpenDeploy }) {
	const { deploy } = props;
	const remove = useMutation(orpc.deploys.remove.mutationOptions());
	return (
		<>
			<Section title="Deploy">
				<Group>
					<DefinitionRow label="Author" value={deploy.author} />
					<DefinitionRow label="Started" value="10:42" />
					<DefinitionRow
						label="Deploy ID"
						value={`dpl_${deploy.id}9q2m`}
						copyable
					/>
				</Group>
			</Section>
			<Section
				title="Removal"
				description="Deleting this deploy takes its URL offline and removes its build output."
				act={{
					label: "Delete deploy",
					destructive: true,
					onAct: () =>
						confirm({
							title: `Delete ${deploy.commit}?`,
							sentence:
								"Its URL goes offline and its build output is removed. This cannot be undone.",
							act: {
								label: "Delete deploy",
								destructive: true,
								onAct: async () => {
									await remove.mutateAsync({ id: deploy.id });
									navigate("/deploys");
								},
							},
							confirmName: {
								value: deploy.commit,
								label: `Type ${deploy.commit} to confirm`,
								blocked: "Type the commit to delete its deploy.",
							},
						}),
				}}
			/>
		</>
	);
}

// The Deploys place, one page at three routes: the list alone, a deploy open
// beside it, and a step of that deploy opened beside the deploy. The deploy is
// read by its id, so an address after its removal draws the missing form.
export function Deploys(props: {
	deployId?: string;
	stepId?: string;
	file?: string;
}) {
	const { deployId, stepId, file } = props;
	const query = useQuery(orpc.deploys.list.queryOptions());
	const open = useQuery(
		orpc.deploys.get.queryOptions({
			input: deployId === undefined ? skipToken : { id: deployId },
		}),
	);
	const opened = open.data?.steps.find((each) => each.id === stepId);
	const removePreviews = useMutation(
		orpc.deploys.removePreviews.mutationOptions(),
	);
	return (
		<Place
			title="Deploys"
			act={{
				label: "Deploy",
				onAct: () =>
					toast("Deploy started", {
						state: "done",
						act: { label: "View", onAct: act },
					}),
			}}
			actions={[
				{ icon: "RefreshCw", label: "Refresh", onAct: () => query.refetch() },
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
			bleed
		>
			<Toolbar>
				<Input kind="search" value="" onChange={act} />
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
				<Chip family="neutral" label="Branch: main" onRemove={act} />
				<Chip family="neutral" label="Author: Ana Ruiz" onRemove={act} />
			</Toolbar>
			<Split
				list={<DeployRows query={query} />}
				main={
					deployId === undefined ? undefined : (
						<QueryBoundary
							query={open}
							sentence="The deploy did not load."
							loading={<ItemHeader title="" loading />}
						>
							{(deploy) => (
								<Record key={deploy.id} deploy={deploy} file={file} />
							)}
						</QueryBoundary>
					)
				}
				beside={
					open.data && opened ? (
						<StepScreen key={opened.id} deploy={open.data} step={opened} />
					) : undefined
				}
				pane={open.data ? <Details deploy={open.data} /> : undefined}
				empty={
					<EmptyState
						icon="Rocket"
						title="No deploy open"
						sentence="Pick a deploy from the list to read its build and its domains."
					/>
				}
			/>
		</Place>
	);
}
