import {
	preload,
	read,
	useMutation,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/settings")({
	loader: ({ context }) =>
		preload(
			context.queryClient,
			orpc.settings.general.read(),
			orpc.devices.list.read(),
		),
	component: Settings,
});

const REGIONS = [
	{ value: "fra", label: "Frankfurt, eu-central-1" },
	{ value: "iad", label: "Washington, us-east-1" },
	{ value: "sin", label: "Singapore, ap-southeast-1" },
] as const;

const DIGESTS = [
	{ value: "day", label: "Daily" },
	{ value: "week", label: "Weekly" },
	{ value: "month", label: "Monthly" },
] as const;

const IMAGES = [
	{ value: "node-24", label: "Node 24", description: "Current, the default" },
	{ value: "node-22", label: "Node 22", description: "Active LTS" },
	{ value: "node-20", label: "Node 20", description: "Maintenance LTS" },
	{ value: "bun-1", label: "Bun 1.3" },
	{ value: "deno-2", label: "Deno 2.5" },
	{ value: "python-3", label: "Python 3.13" },
	{ value: "go-1", label: "Go 1.25" },
] as const;

// The endpoints the workspace posts deploy events to: none is set up yet.
const endpoints = read({
	queryKey: ["webhooks"],
	queryFn: () => Promise.resolve<readonly string[]>([]),
	staleTime: Number.POSITIVE_INFINITY,
});

// Every group is a `Form` that commits by field: a setting sends itself as it
// is changed, and `settings.save` takes one key at a time.
function Settings() {
	const queryClient = useQueryClient();
	// The workspace's general settings as the server holds them: General's
	// fields paint while they load, follow the read, and again on Refresh.
	const workspace = orpc.settings.general.read();
	const paired = orpc.devices.list.read();
	const unpair = useMutation(
		orpc.devices.unpair.mutationOptions({
			meta: { skipAutoInvalidation: true },
			onSuccess: (_none, { name }) =>
				queryClient.setQueryData(orpc.devices.list.queryKey(), (all) =>
					all?.filter((each) => each !== name),
				),
		}),
	);
	return (
		<Pane
			title="Settings"
			actions={[
				{
					icon: "RefreshCw",
					label: "Refresh",
					onAct: () =>
						queryClient.invalidateQueries({
							queryKey: workspace.options.queryKey,
						}),
				},
			]}
		>
			<Section
				title="Webhooks"
				description="Where Acme posts deploy events."
				read={endpoints}
				empty={{ act: { label: "Add endpoint", onAct: act } }}
			/>
			<Section
				title="General"
				description="How the workspace appears to its members."
			>
				<Form
					act={orpc.settings.save}
					commit="field"
					values={workspace}
					submit={{ done: "Settings saved" }}
					fields={{
						name: { label: "Workspace name" },
						slug: {
							label: "Workspace URL",
							locked:
								"Only owners change the address: links already shared stop resolving.",
						},
						about: { label: "Description", control: "prose" },
						region: { label: "Default region", options: REGIONS },
					}}
				/>
			</Section>
			<Section title="Email" description="What the workspace tells you about.">
				<Form
					act={orpc.settings.save}
					commit="field"
					values={{ failed: true, weekly: false, digest: "week", threshold: 5 }}
					submit={{ done: "Settings saved" }}
					fields={{
						failed: {
							label: "Failed deploys",
							description: "An email the moment a deploy fails.",
						},
						weekly: {
							label: "Weekly summary",
							description: "Every Monday, deploys and usage.",
						},
						digest: {
							label: "Digest",
							description: "How often the digest arrives.",
							options: DIGESTS,
						},
						threshold: { label: "Error rate alert" },
					}}
				/>
			</Section>
			<Section
				title="Devices"
				description="Phones paired with the Acme app get deploy alerts there."
				items={paired.at((devices) =>
					devices.map((device) => ({
						key: device,
						leading: { icon: "Smartphone" as const },
						title: device,
						meta: ["Paired Sep 12"],
						more: [
							{
								label: "Unpair",
								icon: "Unlink" as const,
								destructive: true,
								onAct: async () => {
									await unpair.mutateAsync({ name: device });
									toast(`${device} unpaired`);
								},
							},
						],
					})),
				)}
				empty={{ sentence: "A paired phone shows here." }}
			/>
			<Section title="Builds" description="What every deploy builds on.">
				<Banner
					tone="attention"
					sentence="Build images change on Oct 12: Node 20 leaves the list."
					act={{ label: "Read more", onAct: act }}
				/>
				<Form
					act={orpc.settings.save}
					commit="field"
					values={{ image: "node-24" }}
					submit={{ done: "Settings saved" }}
					fields={{
						image: {
							label: "Build image",
							description: "New deploys build on it; running ones keep theirs.",
							options: IMAGES,
						},
					}}
				/>
			</Section>
		</Pane>
	);
}
