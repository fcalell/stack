import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Checkbox } from "@fcalell/plugin-react-ui/components/checkbox";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { QrCode } from "@fcalell/plugin-react-ui/components/qr-code";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { SegmentedControl } from "@fcalell/plugin-react-ui/components/segmented-control";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { TextArea } from "@fcalell/plugin-react-ui/components/text-area";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { act } from "../../lib/act.ts";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/settings")({
	component: Settings,
});

const REGIONS = [
	{ value: "fra", label: "Frankfurt, eu-central-1" },
	{ value: "iad", label: "Washington, us-east-1" },
	{ value: "sin", label: "Singapore, ap-southeast-1" },
];

const DIGESTS = [
	{ value: "day", label: "Daily" },
	{ value: "week", label: "Weekly" },
	{ value: "month", label: "Monthly" },
];

const IMAGES = [
	{ value: "node-24", label: "Node 24", description: "Current, the default" },
	{ value: "node-22", label: "Node 22", description: "Active LTS" },
	{ value: "node-20", label: "Node 20", description: "Maintenance LTS" },
	{ value: "bun-1", label: "Bun 1.3" },
	{ value: "deno-2", label: "Deno 2.5" },
	{ value: "python-3", label: "Python 3.13" },
	{ value: "go-1", label: "Go 1.25" },
];

function Settings() {
	const queryClient = useQueryClient();
	// The workspace's general settings as the server holds them: General waits
	// as its fields while they load, and again on Refresh, its typed text kept.
	const workspace = useQuery(orpc.settings.general.queryOptions());
	const [typed, setTyped] = useState<{
		name?: string;
		about?: string;
		region?: string;
	}>({});
	const name = typed.name ?? workspace.data?.name ?? "";
	const about = typed.about ?? workspace.data?.about ?? "";
	const region = typed.region ?? workspace.data?.region ?? "";
	const [failed, setFailed] = useState(true);
	const [weekly, setWeekly] = useState(false);
	const [digest, setDigest] = useState("week");
	const [threshold, setThreshold] = useState(5);
	const [image, setImage] = useState("node-24");
	const paired = useQuery(orpc.devices.list.queryOptions());
	const unpair = useMutation(
		orpc.devices.unpair.mutationOptions({
			meta: { skipAutoInvalidation: true },
			onSuccess: (_none, { name }) =>
				queryClient.setQueryData(orpc.devices.list.queryKey(), (all) =>
					all?.filter((each) => each !== name),
				),
		}),
	);
	const save = useMutation(orpc.settings.save.mutationOptions());
	// General's fields, also the boundary's loading form, so the skeleton
	// stands as many fields as the loaded form.
	const general = (
		<>
			<FormField label="Workspace name">
				<Input
					value={name}
					onChange={(next) => setTyped({ ...typed, name: next })}
				/>
			</FormField>
			<FormField
				label="Workspace URL"
				description="Only owners change the address: links already shared stop resolving."
				disabled
			>
				<Input value={workspace.data?.slug ?? ""} onChange={act} />
			</FormField>
			<FormField label="Description">
				<TextArea
					value={about}
					onChange={(next) => setTyped({ ...typed, about: next })}
					budget={120}
				/>
			</FormField>
			<FormField label="Default region">
				<Select
					value={region}
					onChange={(next) => setTyped({ ...typed, region: next })}
					options={REGIONS}
				/>
			</FormField>
		</>
	);
	return (
		<Place
			title="Settings"
			actions={[
				{
					icon: "RefreshCw",
					label: "Refresh",
					onAct: () => workspace.refetch(),
				},
			]}
		>
			<Form>
				<Section
					title="General"
					description="How the workspace appears to its members."
					loading={workspace.isFetching}
				>
					<QueryBoundary
						query={workspace}
						sentence="General settings did not load."
						loading={general}
					>
						{() => general}
					</QueryBoundary>
				</Section>
				<Section
					title="Email"
					description="What the workspace tells you about."
				>
					<FormField
						label="Failed deploys"
						description="An email the moment a deploy fails."
					>
						<Switch
							checked={failed}
							onChange={setFailed}
							label="Failed deploys"
						/>
					</FormField>
					<FormField
						label="Weekly summary"
						description="Every Monday, deploys and usage."
					>
						<Checkbox
							checked={weekly}
							onChange={setWeekly}
							label="Weekly summary"
						/>
					</FormField>
					<FormField label="Digest" description="How often the digest arrives.">
						<SegmentedControl
							label="Digest"
							options={DIGESTS}
							value={digest}
							onChange={setDigest}
						/>
					</FormField>
					<Slider
						label="Error rate alert"
						value={threshold}
						onChange={setThreshold}
						min={1}
						max={20}
						unit="percent"
					/>
				</Section>
				<Section
					title="Devices"
					description="Scan the code with the Acme app on your phone to get deploy alerts there."
				>
					<QrCode value="https://acme.dev/pair/7KQ2XM" />
					<Group>
						<List
							query={paired}
							sentence="Paired devices did not load."
							empty={{
								icon: "Smartphone",
								title: "No devices",
								sentence: "A phone that scans the code shows here.",
							}}
							row={{
								key: (device) => device,
								leading: { icon: () => "Smartphone" },
								title: (device) => device,
								meta: () => ["Paired Sep 12"],
								more: (device) => [
									{
										label: "Unpair",
										icon: "Unlink",
										destructive: true,
										onAct: async () => {
											await unpair.mutateAsync({ name: device });
											toast(`${device} unpaired`, { state: "done" });
										},
									},
								],
							}}
						/>
					</Group>
				</Section>
				<Banner
					kind="warn"
					sentence="Build images change on Oct 12: Node 20 leaves the list."
					act={{ label: "Read more", onAct: act }}
				/>
				<Section title="Builds" description="What every deploy builds on.">
					<FormField
						label="Build image"
						description="New deploys build on it; running ones keep theirs."
					>
						<Select options={IMAGES} value={image} onChange={setImage} />
					</FormField>
				</Section>
				<Section title="Webhooks" description="Where Acme posts deploy events.">
					<EmptyState
						icon="Webhook"
						title="No endpoints"
						sentence="Add an endpoint to receive an event each time a deploy finishes."
						act={{ label: "Add endpoint", onAct: act }}
					/>
				</Section>
				<ActionBar
					acts={[
						{ label: "Cancel", onAct: act },
						{
							label: "Save",
							onAct: async () => {
								await save.mutateAsync({
									name,
									about,
									region,
									failed,
									weekly,
									digest,
									threshold,
									image,
								});
								toast("Settings saved", { state: "done" });
							},
						},
					]}
				/>
			</Form>
		</Place>
	);
}
