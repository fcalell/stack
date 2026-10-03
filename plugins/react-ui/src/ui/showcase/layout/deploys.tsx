import type { MenuItem, Option } from "@fcalell/ui-core/descriptors";
import type { ChipFamily, StatusState } from "@fcalell/ui-core/tokens";
import { use, useState } from "react";
import { Banner } from "../../components/banner/index.tsx";
import { Button } from "../../components/button/index.tsx";
import { Chip } from "../../components/chip/index.tsx";
import { DefinitionRow } from "../../components/definition-row/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { IconButton } from "../../components/icon-button/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { ItemHeader } from "../../components/item-header/index.tsx";
import { List } from "../../components/list/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import { PendingBar } from "../../components/pending-bar/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import { Toolbar } from "../../components/toolbar/index.tsx";
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
import { DeployChanges } from "./changes.tsx";
import { act, HereContext, settle, useFixture, useTo } from "./here.ts";

interface Deploy {
	id: string;
	message: string;
	branch: string;
	commit: string;
	age: string;
	state: StatusState;
	// A person started it; a schedule's deploy leads with its dot instead.
	author?: string;
	env: { family: ChipFamily; label: string };
}

const PRODUCTION = { family: "teal", label: "Production" } as const;
const PREVIEW = { family: "violet", label: "Preview" } as const;

const DEPLOYS: Deploy[] = [
	{
		id: "d1",
		author: "Ana Ruiz",
		message: "Cache build output between deploys",
		branch: "main",
		commit: "a41c9e2",
		age: "2 min",
		state: "active",
		env: PRODUCTION,
	},
	{
		id: "d2",
		author: "Ben Kaya",
		message: "Move image resizing to the edge",
		branch: "preview/img-edge",
		commit: "7d0e2b1",
		age: "18 min",
		state: "done",
		env: PREVIEW,
	},
	{
		id: "d3",
		author: "Ema Okafor",
		message: "Pin wrangler to 4.12",
		branch: "main",
		commit: "0c5e4aa",
		age: "1 h",
		state: "failed",
		env: PRODUCTION,
	},
	{
		id: "d4",
		author: "Ana Ruiz",
		message: "Add Frankfurt to the region list",
		branch: "preview/regions",
		commit: "b71d0e2",
		age: "3 h",
		state: "waiting",
		env: PREVIEW,
	},
	{
		id: "d5",
		message: "Nightly rebuild",
		branch: "main",
		commit: "e93a6c0",
		age: "1 d",
		state: "done",
		env: PRODUCTION,
	},
];

const LABELS: Record<StatusState, string> = {
	active: "Building",
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

function DeployRows(props: { deploys: Deploy[] }) {
	const { record } = use(HereContext);
	const to = useTo();
	return (
		<List>
			{props.deploys.map((deploy) => (
				<ListRow
					key={deploy.id}
					leading={
						deploy.author
							? { avatar: { name: deploy.author } }
							: { status: deploy.state }
					}
					title={deploy.message}
					meta={[deploy.branch, deploy.commit]}
					trailing={{ age: deploy.age }}
					status={
						deploy.author
							? { state: deploy.state, label: LABELS[deploy.state] }
							: undefined
					}
					chip={deploy.env}
					more={moreOf(deploy)}
					// The open record's row is current at the page's own path.
					href={
						deploy.id === record
							? location.pathname
							: to({ place: "deploys", record: deploy.id })
					}
				/>
			))}
		</List>
	);
}

// The open deploy: its head, what it waits on, its facts.
function Record(props: { deploy: Deploy }) {
	const { deploy } = props;
	const [state, setState] = useState(deploy.state);
	const [redeploying, setRedeploying] = useState(deploy.state === "active");
	const [until] = useState(() => new Date(Date.now() + 90_000));
	return (
		<>
			<ItemHeader
				overline={["acme-web", deploy.env.label]}
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
					deploy.author ?? "Schedule",
					`${deploy.age} ago`,
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
			<DeployChanges id={deploy.id} />
		</>
	);
}

// The open deploy's details, the Split's pane (a sheet below `wide`).
function Details(props: { deploy: Deploy }) {
	const { deploy } = props;
	const to = useTo();
	return (
		<>
			<Section title="Deploy">
				<Group>
					<DefinitionRow label="Author" value={deploy.author ?? "Schedule"} />
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
									await settle();
									location.assign(to({ place: "deploys" }));
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

export function Deploys() {
	const { record } = use(HereContext);
	const query = useFixture(DEPLOYS);
	const open = DEPLOYS.find((deploy) => deploy.id === record);
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
									await settle();
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
				list={
					<QueryBoundary query={query} sentence="Deploys did not load.">
						{(deploys) => <DeployRows deploys={deploys} />}
					</QueryBoundary>
				}
				main={open ? <Record key={open.id} deploy={open} /> : undefined}
				pane={open ? <Details deploy={open} /> : undefined}
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
