import { useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Banner } from "../../components/banner/index.tsx";
import { Checkbox } from "../../components/checkbox/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { QrCode } from "../../components/qr-code/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { SegmentedControl } from "../../components/segmented-control/index.tsx";
import { Select } from "../../components/select/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import { TextArea } from "../../components/text-area/index.tsx";
import { toast } from "../../lib/toast.ts";
import { act, settle, useFixture } from "./here.ts";

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

export function Settings() {
	const [name, setName] = useState("Acme");
	const [about, setAbout] = useState(
		"Production and preview deploys for the Acme storefront and its API.",
	);
	const [region, setRegion] = useState("fra");
	const [failed, setFailed] = useState(true);
	const [weekly, setWeekly] = useState(false);
	const [digest, setDigest] = useState("week");
	const [threshold, setThreshold] = useState(5);
	const [image, setImage] = useState("node-24");
	const [devices, setDevices] = useState(["Ana's Pixel 9"]);
	const paired = useFixture(devices);
	return (
		<Place title="Settings">
			<Form>
				<Section
					title="General"
					description="How the workspace appears to its members."
				>
					<FormField label="Workspace name">
						<Input value={name} onChange={setName} />
					</FormField>
					<FormField
						label="Workspace URL"
						description="Only owners change the address: links already shared stop resolving."
						disabled
					>
						<Input value="acme" onChange={act} />
					</FormField>
					<FormField label="Description">
						<TextArea value={about} onChange={setAbout} budget={120} />
					</FormField>
					<FormField label="Default region">
						<Select value={region} onChange={setRegion} options={REGIONS} />
					</FormField>
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
										onAct: () => {
											setDevices((all) =>
												all.filter((each) => each !== device),
											);
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
								await settle();
								toast("Settings saved", { state: "done" });
							},
						},
					]}
				/>
			</Form>
		</Place>
	);
}
