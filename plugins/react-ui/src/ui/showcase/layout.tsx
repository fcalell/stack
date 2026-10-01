import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { ActionBar } from "../components/action-bar/index.tsx";
import { Avatar } from "../components/avatar/index.tsx";
import { Button } from "../components/button/index.tsx";
import { Checkbox } from "../components/checkbox/index.tsx";
import { Chip } from "../components/chip/index.tsx";
import { Columns } from "../components/columns/index.tsx";
import { Form } from "../components/form/index.tsx";
import { Group } from "../components/group/index.tsx";
import { IconButton } from "../components/icon-button/index.tsx";
import { Input } from "../components/input/index.tsx";
import { InputOtp } from "../components/input-otp/index.tsx";
import { Link } from "../components/link/index.tsx";
import { List } from "../components/list/index.tsx";
import { Place } from "../components/place/index.tsx";
import { Screen } from "../components/screen/index.tsx";
import { Section } from "../components/section/index.tsx";
import { Select } from "../components/select/index.tsx";
import { Shell } from "../components/shell/index.tsx";
import { Slider } from "../components/slider/index.tsx";
import { Split } from "../components/split/index.tsx";
import { Status } from "../components/status/index.tsx";
import { Switch } from "../components/switch/index.tsx";
import { Text } from "../components/text/index.tsx";
import { TextArea } from "../components/text-area/index.tsx";
import { Toolbar } from "../components/toolbar/index.tsx";
import { StandInRows } from "./frames/layout-context.tsx";
import { useView, ViewBar } from "./view.tsx";

const act = () => {};

// The selected place is the page the review stands on.
function places(selected: string): PlaceSpec[] {
	const at = (route: string, label: string) =>
		label === selected ? location.pathname : route;
	return [
		{
			route: at("/activity", "Activity"),
			label: "Activity",
			icon: "Activity",
			count: 3,
		},
		{ route: at("/deploys", "Deploys"), label: "Deploys", icon: "Rocket" },
		{ route: at("/projects", "Projects"), label: "Projects", icon: "Folder" },
		{ route: at("/usage", "Usage"), label: "Usage", icon: "ChartColumn" },
		{ route: at("/domains", "Domains"), label: "Domains", icon: "Globe" },
		{ route: at("/logs", "Logs"), label: "Logs", icon: "Logs" },
		{ route: at("/members", "Members"), label: "Members", icon: "Users" },
		{ route: at("/settings", "Settings"), label: "Settings", icon: "Settings" },
	];
}

const SWITCHER: Switcher = {
	label: "Workspaces",
	name: "Acme",
	options: [
		{ label: "Acme", onAct: act },
		{ label: "Globex", onAct: act },
		{ label: "Initech", onAct: act },
	],
	create: { label: "New workspace", icon: "Plus", onAct: act },
};

// The whole layout layer composed as a product composes it, at the URL's
// mode and density: five frames, each the page's full width.
export function Layout() {
	const [view, change] = useView();
	return (
		<main className="flex flex-col gap-sections pb-page min-h-screen">
			<header className="flex flex-row flex-wrap items-center gap-inside px-page pt-page">
				<h1 className={text({ role: "title" })}>Layout</h1>
				<ViewBar view={view} onChange={change} />
			</header>
			<Frame caption="Deploys">
				<Deploys />
			</Frame>
			<Frame caption="Settings">
				<Settings />
			</Frame>
			<Frame caption="Members">
				<Members />
			</Frame>
			<Frame caption="Verify domain">
				<VerifyDomain />
			</Frame>
			<Frame caption="Empty">
				<Empty />
			</Frame>
		</main>
	);
}

function Frame(props: { caption: string; children: ReactNode }) {
	return (
		<section data-frame={props.caption} className="flex flex-col gap-fields">
			<h2 className={cn(text({ role: "heading" }), "px-page")}>
				{props.caption}
			</h2>
			{props.children}
		</section>
	);
}

// ── Deploys ─────────────────────────────────────────────────────────

interface Deploy {
	author: string;
	message: string;
	meta: string;
	state: StatusState;
}

const DEPLOYS: Deploy[] = [
	{
		author: "Ana Ruiz",
		message: "Cache build output between deploys",
		meta: "main · 2 min ago",
		state: "active",
	},
	{
		author: "Ben Kaya",
		message: "Move image resizing to the edge",
		meta: "preview/img-edge · 18 min ago",
		state: "done",
	},
	{
		author: "Ema Okafor",
		message: "Pin wrangler to 4.12",
		meta: "main · 1 h ago",
		state: "failed",
	},
	{
		author: "Ana Ruiz",
		message: "Add Frankfurt to the region list",
		meta: "preview/regions · 3 h ago",
		state: "waiting",
	},
	{
		author: "Ben Kaya",
		message: "Rotate the analytics token",
		meta: "main · yesterday",
		state: "done",
	},
];

// Stand-in: the list row molecule is the shared group's; until it is built a
// row is the row cell with built atoms inside.
function DeployRow(props: { deploy: Deploy; selected?: boolean }) {
	const { deploy } = props;
	return (
		<div
			className={cn(
				row({ ground: "list", state: props.selected ? "selected" : "rest" }),
				"flex items-center",
			)}
		>
			<Avatar name={deploy.author} />
			<div className="flex flex-col min-w-0 grow">
				<Text strong>{deploy.message}</Text>
				<Text role="meta">{deploy.meta}</Text>
			</div>
			<Status state={deploy.state} />
		</div>
	);
}

// Stand-in: a label and its value on the row cell inside a Group, until the
// shared group's property row is built.
function Property(props: { label: string; value: string }) {
	return (
		<div
			className={cn(
				row({ ground: "group" }),
				"flex items-center justify-between",
			)}
		>
			<Text role="meta">{props.label}</Text>
			<Text>{props.value}</Text>
		</div>
	);
}

function Deploys() {
	return (
		<Shell places={places("Deploys")} switcher={SWITCHER}>
			<Place
				title="Deploys"
				act={{ label: "Deploy", onAct: act }}
				actions={[{ icon: "RefreshCw", label: "Refresh", onAct: act }]}
				more={[
					{ label: "Copy deploy hook", onAct: act },
					{ label: "Export as CSV", onAct: act },
					{ label: "Delete all previews", onAct: act, destructive: true },
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
						<List>
							{DEPLOYS.map((deploy, at) => (
								<DeployRow
									key={deploy.message}
									deploy={deploy}
									selected={at === 0}
								/>
							))}
						</List>
					}
					main={<Opened />}
					pane={<OpenedDetails />}
				/>
			</Place>
		</Shell>
	);
}

// The selected deploy.
function Opened() {
	return (
		<>
			<Section title="Summary">
				<Group>
					<Property label="Commit" value="a41c9e2" />
					<Property label="Branch" value="main" />
					<Property label="Region" value="Frankfurt, eu-central-1" />
					<Property label="Duration" value="1 min 42 s" />
				</Group>
			</Section>
			<Section title="Domains" count={2}>
				<Group>
					<Property label="acme.dev" value="Primary" />
					<Property label="www.acme.dev" value="Redirect" />
				</Group>
			</Section>
			<Section title="Environment" count={3}>
				<Group>
					<Property label="DATABASE_URL" value="Encrypted" />
					<Property label="ANALYTICS_TOKEN" value="Encrypted" />
					<Property label="LOG_LEVEL" value="warn" />
				</Group>
			</Section>
			<Section title="Functions" loading>
				<Group>
					<Property label="api" value="128 MB" />
					<Property label="resize" value="256 MB" />
				</Group>
			</Section>
			<Section
				title="Removal"
				description="Deleting this deploy takes its URL offline and removes its build output."
				act={{ label: "Delete deploy", onAct: act, destructive: true }}
			/>
			<Section title="Build log" count={214} folded onToggle={act}>
				<Group>
					<Property label="Install" value="12 s" />
					<Property label="Build" value="1 min 18 s" />
				</Group>
			</Section>
		</>
	);
}

// The selected deploy's details, the Split's pane.
function OpenedDetails() {
	return (
		<Section title="Details">
			<Group>
				<Property label="Author" value="Ana Ruiz" />
				<Property label="Started" value="10:42" />
			</Group>
		</Section>
	);
}

// ── Settings ────────────────────────────────────────────────────────

// Stand-in: a labelled field until the shared group's `FormField` is built;
// Base UI's field wires the label, the description and the disabled state.
function Labelled(props: {
	label: string;
	description?: string;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<Field.Root
			disabled={props.disabled}
			className="flex flex-col gap-pair min-w-0"
		>
			<Field.Label
				className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
			>
				{props.label}
			</Field.Label>
			{props.children}
			{props.description ? (
				<Field.Description className={text({ role: "meta" })}>
					{props.description}
				</Field.Description>
			) : null}
		</Field.Root>
	);
}

// Stand-in: a setting row inside a Group until the shared group's settings
// row is built: the label and its sentence beside the control.
function Setting(props: {
	label: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-fields min-h-row-setting px-card py-pair">
			<div className="flex grow min-w-0 flex-col">
				<Text strong>{props.label}</Text>
				<Text role="meta">{props.description}</Text>
			</div>
			{props.children}
		</div>
	);
}

const REGIONS = [
	{ value: "fra", label: "Frankfurt, eu-central-1" },
	{ value: "iad", label: "Washington, us-east-1" },
	{ value: "sin", label: "Singapore, ap-southeast-1" },
];

function Settings() {
	return (
		<Shell places={places("Settings")} switcher={SWITCHER}>
			<Place title="Settings">
				<Form>
					<Section
						title="General"
						description="How the workspace appears to its members."
					>
						<Labelled label="Workspace name">
							<Input value="Acme" onChange={act} />
						</Labelled>
						<Labelled
							label="Workspace URL"
							description="Only owners change the address: links already shared stop resolving."
							disabled
						>
							<Input value="acme" onChange={act} />
						</Labelled>
						<Labelled label="Description">
							<TextArea
								value="Production and preview deploys for the Acme storefront and its API."
								onChange={act}
								budget={40}
							/>
						</Labelled>
						<Labelled label="Default region">
							<Select value="fra" onChange={act} options={REGIONS} />
						</Labelled>
					</Section>
					<Section
						title="Notifications"
						description="What the workspace tells you about."
					>
						<Group>
							<Setting
								label="Failed deploys"
								description="An email the moment a deploy fails"
							>
								<Switch checked onChange={act} label="Failed deploys" />
							</Setting>
							<Setting
								label="Weekly summary"
								description="Every Monday, deploys and usage"
							>
								<Checkbox
									checked={false}
									onChange={act}
									label="Weekly summary"
								/>
							</Setting>
						</Group>
						<Slider
							label="Error rate alert"
							value={5}
							onChange={act}
							min={1}
							max={20}
							unit="percent"
						/>
					</Section>
					<ActionBar
						acts={[
							{ label: "Cancel", onAct: act },
							{ label: "Save", onAct: act },
						]}
					/>
				</Form>
			</Place>
		</Shell>
	);
}

// ── Members ─────────────────────────────────────────────────────────

const ROLES = [
	{ title: "Owners", count: 3 },
	{ title: "Admins", count: 3 },
	{ title: "Developers", count: 3 },
	{ title: "Viewers", count: 3 },
];

// A board: a column per role, the row scrolling sideways in the body.
function Members() {
	return (
		<Shell places={places("Members")} switcher={SWITCHER}>
			<Place title="Members" act={{ label: "Invite", onAct: act }}>
				<Columns>
					{ROLES.map(({ title, count }) => (
						<Section
							key={title}
							title={title}
							count={count}
							act={{
								icon: "UserPlus",
								label: `Invite to ${title}`,
								onAct: act,
							}}
						>
							<Group>
								<StandInRows ground="group" />
							</Group>
						</Section>
					))}
				</Columns>
			</Place>
		</Shell>
	);
}

// ── Verify domain ───────────────────────────────────────────────────

// A pushed Screen over Domains, its submit pending.
function VerifyDomain() {
	return (
		<Shell places={places("Domains")} switcher={SWITCHER}>
			<Screen title="Verify domain" back="/domains">
				<Form>
					<Text>
						Enter the six-digit code from the TXT record we added to
						shop.acme.dev.
					</Text>
					<Labelled label="Code">
						<InputOtp length={6} value="482913" onChange={act} />
					</Labelled>
					<Link href="#" fit="standalone">
						Show the DNS record again
					</Link>
					<ActionBar acts={[{ label: "Verify", onAct: act, loading: true }]} />
				</Form>
			</Screen>
		</Shell>
	);
}

// ── Empty ───────────────────────────────────────────────────────────

const DOMAINS: Array<{ name: string; state: StatusState; meta: string }> = [
	{ name: "acme.dev", state: "done", meta: "Primary · certificate valid" },
	{ name: "www.acme.dev", state: "done", meta: "Redirects to acme.dev" },
	{ name: "shop.acme.dev", state: "waiting", meta: "Waiting for DNS" },
];

// The Split's empty state is the content group's `EmptyState`, not yet built:
// the main draws only its own empty cell.
function Empty() {
	return (
		<Shell places={places("Domains")} switcher={SWITCHER}>
			<Place title="Domains" act={{ label: "Add domain", onAct: act }} bleed>
				<Split
					list={
						<List>
							{DOMAINS.map((domain) => (
								// Stand-in: the list row molecule is the shared group's.
								<div
									key={domain.name}
									className={cn(row({ ground: "list" }), "flex items-center")}
								>
									<div className="flex flex-col min-w-0 grow">
										<Text strong>{domain.name}</Text>
										<Text role="meta">{domain.meta}</Text>
									</div>
									<Status state={domain.state} />
								</div>
							))}
						</List>
					}
				/>
			</Place>
		</Shell>
	);
}
