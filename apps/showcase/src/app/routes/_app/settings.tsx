import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { QrCode } from "@fcalell/plugin-react-ui/components/qr-code";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
import { Section } from "@fcalell/plugin-react-ui/components/section";
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
			<FormField
				label="Default region"
				select={{
					value: region,
					onChange: (next) => setTyped({ ...typed, region: next }),
					options: REGIONS,
				}}
			/>
		</>
	);
	return (
		<Place>
			<Pane
				title="Settings"
				actions={[
					{
						icon: "RefreshCw",
						label: "Refresh",
						onAct: () => workspace.refetch(),
					},
				]}
			>
				<Form
					bar={{
						acts: [
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
						],
					}}
					groups={[
						{
							title: "General",
							description: "How the workspace appears to its members.",
							loading: workspace.isFetching,
							fields: (
								<QueryBoundary
									query={workspace}
									sentence="General settings did not load."
									loading={general}
								>
									{() => general}
								</QueryBoundary>
							),
						},
						{
							title: "Email",
							description: "What the workspace tells you about.",
							fields: (
								<>
									<FormField
										label="Failed deploys"
										description="An email the moment a deploy fails."
										switch={{ checked: failed, onChange: setFailed }}
									/>
									<FormField
										label="Weekly summary"
										description="Every Monday, deploys and usage."
										checkbox={{ checked: weekly, onChange: setWeekly }}
									/>
									<FormField
										label="Digest"
										description="How often the digest arrives."
										segments={{
											options: DIGESTS,
											value: digest,
											onChange: setDigest,
										}}
									/>
									<FormField
										label="Error rate alert"
										slider={{
											value: threshold,
											onChange: setThreshold,
											min: 1,
											max: 20,
											unit: "percent",
										}}
									/>
								</>
							),
						},
						{
							title: "Devices",
							description:
								"Scan the code with the Acme app on your phone to get deploy alerts there.",
							fields: (
								<>
									<QrCode value="https://acme.dev/pair/7KQ2XM" />
									<Group
										list={{
											query: paired,
											sentence: "Paired devices did not load.",
											empty: {
												icon: "Smartphone",
												title: "No devices",
												sentence: "A phone that scans the code shows here.",
											},
											row: {
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
											},
										}}
									/>
								</>
							),
						},
						{
							title: "Builds",
							description: "What every deploy builds on.",
							lead: (
								<Banner
									kind="warn"
									sentence="Build images change on Oct 12: Node 20 leaves the list."
									act={{ label: "Read more", onAct: act }}
								/>
							),
							fields: (
								<FormField
									label="Build image"
									description="New deploys build on it; running ones keep theirs."
									select={{ options: IMAGES, value: image, onChange: setImage }}
								/>
							),
						},
					]}
				/>
				<Section
					title="Webhooks"
					description="Where Acme posts deploy events."
					empty={{
						icon: "Webhook",
						title: "No endpoints",
						sentence:
							"Add an endpoint to receive an event each time a deploy finishes.",
						act: { label: "Add endpoint", onAct: act },
					}}
				/>
			</Pane>
		</Place>
	);
}
