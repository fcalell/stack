import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import {
	type RowItem,
	Section,
} from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { drawToast } from "@fcalell/plugin-react-ui/showcase/frames/toast";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type {
	ChipFamily,
	OptionPick,
	PlaceSpec,
	RowTitle,
	Tone,
} from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

// The specimen: every part of the web roster the owner judges the face by, on
// one page, light and dark side by side, so a look reads as one family. It
// draws what exists and takes no class on a roster component; its host `div`s
// carry the mode, the ground and geometry. A story cannot pin a density per
// frame (`data-density` on the root is the pin), so the phone frame is its own
// story, `FacePhone`.
export default {
	title: "Specimen",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const act = () => {};
const MODES = ["light", "dark"] as const;

// A panel on the canvas in one mode: the ground a look is judged on.
function Panel(props: { mode: (typeof MODES)[number]; children: ReactNode }) {
	return (
		<div
			className={`${props.mode} bg-canvas rounded-card p-pad min-w-0 flex flex-col gap-pad`}
		>
			{props.children}
		</div>
	);
}

// One row of the specimen: the same content in each mode, side by side.
function Row(props: { children: (mode: "light" | "dark") => ReactNode }) {
	return (
		<div className="flex flex-wrap gap-pad items-start">
			{MODES.map((mode) => (
				<Panel key={mode} mode={mode}>
					{props.children(mode)}
				</Panel>
			))}
		</div>
	);
}

// 1. Controls strip.
const FAMILIES: [ChipFamily, string][] = [
	["teal", "string"],
	["violet", "number"],
	["pink", "boolean"],
	["amber", "array"],
	["green", "object"],
	["neutral", "other"],
];
const STATES: Tone[] = [
	"active",
	"running",
	"waiting",
	"done",
	"attention",
	"failed",
	"idle",
];

function Controls() {
	return (
		<div className="flex flex-wrap items-center gap-pad">
			<Button act="primary" label="Change" onAct={act} />
			<Button act="secondary" label="Add field" onAct={act} />
			<Button glyph icon="Ellipsis" label="More" onAct={act} />
			<Picker
				fit="pill"
				label="Spec context"
				value="live"
				onChange={act}
				options={[
					{ value: "live", label: "Live" },
					{ value: "spring", label: "Spring launch" },
					{ value: "v12", label: "Version 12" },
				]}
			/>
			<Picker
				fit="segments"
				label="View"
				value="fields"
				onChange={act}
				options={VIEWS}
			/>
			<Input
				kind="search"
				value=""
				onChange={act}
				placeholder="Search fields"
			/>
			<Toolbar
				chips={FAMILIES.map(([family, label]) => ({
					family,
					label,
					onRemove: act,
				}))}
			/>
			<Section
				title="Marks"
				items={[
					...STATES.map((tone) => ({
						key: tone,
						title: tone,
						status: { tone },
					})),
					...STATES.map((tone) => ({
						key: `${tone}-chip`,
						title: tone,
						status: { tone, label: tone },
					})),
					{
						key: "ana",
						title: "Ana Ruiz",
						leading: { avatar: { name: "Ana Ruiz" } },
					},
				]}
			/>
			<Switch checked onChange={act} label="Required" />
			<Switch checked onChange={act} label="Personal data" />
		</div>
	);
}

const VIEWS = [
	{ value: "fields", label: "Fields" },
	{ value: "page-types", label: "Page types" },
	{ value: "tracked", label: "Tracked actions" },
];

// 2. Rows.
type DataType = "string" | "number" | "boolean" | "array" | "object";

// A type's chip family: the one place a type is told from another.
const FAMILY: Record<DataType, ChipFamily> = {
	string: "teal",
	number: "violet",
	boolean: "pink",
	array: "amber",
	object: "green",
};

interface Field {
	key: string;
	group: "page" | "commerce";
	type: DataType;
	required: boolean;
	sentence: string;
	children?: Field[];
}

const MARK: Record<DataType, string> = {
	string: "T",
	number: "#",
	boolean: "?",
	array: "[]",
	object: "{}",
};

const FIELDS: Field[] = [
	{
		key: "page_type",
		group: "page",
		type: "string",
		required: true,
		sentence: "Which kind of page this is.",
	},
	{
		key: "page_title",
		group: "page",
		type: "string",
		required: true,
		sentence: "The title the page shows.",
	},
	{
		key: "page_depth",
		group: "page",
		type: "number",
		required: true,
		sentence: "How many levels below the home page.",
	},
	{
		key: "page_secure",
		group: "page",
		type: "boolean",
		required: false,
		sentence: "Whether the page is served over https.",
	},
	{
		key: "page_path",
		group: "page",
		type: "array",
		required: true,
		sentence: "The path split into its segments.",
	},
	{
		key: "order",
		group: "commerce",
		type: "object",
		required: true,
		sentence: "The order being placed.",
	},
	{
		key: "product",
		group: "commerce",
		type: "object",
		required: true,
		sentence: "The product on the page.",
		children: [
			{
				key: "product_variant",
				group: "commerce",
				type: "string",
				required: true,
				sentence: "The variant chosen.",
			},
			{
				key: "product_price",
				group: "commerce",
				type: "number",
				required: false,
				sentence: "The price in the shop currency.",
			},
		],
	},
];

const GROUPS = [
	{
		key: "page",
		label: "Page",
		act: { icon: "Plus", label: "Add a page field", onAct: act },
	},
	{
		key: "commerce",
		label: "Commerce",
		act: { icon: "Plus", label: "Add a commerce field", onAct: act },
	},
] as const;

const toRow = (field: Field): RowItem => ({
	key: field.key,
	group: field.group,
	children: field.children?.map(toRow),
	leading: { mark: MARK[field.type], family: FAMILY[field.type] },
	title: { code: field.key },
	meta: [field.sentence],
	chip: { family: FAMILY[field.type], label: field.type },
	href: `/standards/${field.key}`,
	selected: field.key === "page_title",
});
const FIELD_ROWS = FIELDS.map(toRow);

function Fields() {
	return <Section items={FIELD_ROWS} groups={GROUPS} />;
}

interface Fact {
	label: string;
	title: RowTitle;
}

const FACTS: Fact[] = [
	{ label: "Type", title: "String" },
	{ label: "Allowed values", title: { absent: "Any" } },
	{ label: "Applies to", title: "Page views, Product views, Orders" },
	{ label: "Personal data", title: "No" },
];

// The Name is the one identifier, so it is the one fact that copies whole
// (`copyable` draws a value in the code role with a copy act).
function Definitions() {
	return (
		<>
			<Section
				items={[{ label: "Name", title: { code: "products", copy: true } }]}
			/>
			<Section items={FACTS} />
		</>
	);
}

// 3. Frame.
const PLACES: PlaceSpec[] = [
	{ route: "/home", label: "Home", icon: "House" },
	{ route: "/projects", label: "Projects", icon: "Folder" },
	{
		route: "/requests",
		label: "Requests",
		icon: "Inbox",
		count: 7,
		group: "Work",
	},
	{ route: "/versions", label: "Versions", icon: "GitBranch", group: "Work" },
	{ route: "/history", label: "History", icon: "History", group: "Work" },
	{
		route: "/inventory",
		label: "Inventory",
		icon: "Boxes",
		count: 24,
		group: "Work",
	},
	// The current place is the page the story stands on.
	{
		route: location.pathname,
		label: "Standards",
		icon: "Ruler",
		group: "Shared assets",
	},
	{
		route: "/destinations",
		label: "Destinations",
		icon: "Send",
		group: "Shared assets",
	},
	{
		route: "/profiles",
		label: "Tag manager profiles",
		icon: "Tags",
		group: "Shared assets",
	},
	{ route: "/notes", label: "Notes", icon: "StickyNote", end: true },
	{ route: "/settings", label: "Settings", icon: "Settings", end: true },
];

const SWITCHER: OptionPick = {
	label: "Organization",
	value: "acme",
	onChange: act,
	options: [
		{ value: "acme", label: "Acme Demo", avatar: {} },
		{ value: "globex", label: "Globex Demo", avatar: {} },
	],
	act: { label: "New organization", icon: "Plus", onAct: act },
};

const CONTEXTS = [
	{ value: "live", label: "Live" },
	{ value: "spring", label: "Spring launch" },
	{ value: "v12", label: "Version 12" },
];

function Standard() {
	const reads = readsAt("specimen");
	return (
		<>
			<Pane
				title="Acme Demo standard"
				back="/projects"
				state="active"
				context={{
					label: "Spec context",
					value: "live",
					onChange: act,
					options: CONTEXTS,
				}}
				actions={[
					{ icon: "Plus", label: "Add field", onAct: act },
					{ icon: "Pencil", label: "Change", onAct: act },
				]}
			>
				<Toolbar
					tabs={VIEWS.map(({ value, label }) => ({
						label,
						href: `/views/${value}`,
					}))}
					search={{ value: "", onChange: act, placeholder: "Search fields" }}
				/>
				<Fields />
			</Pane>
			<Pane
				title={{ code: "products" }}
				record={{
					within: "Acme Demo standard",
					facts: [
						{ status: "active", label: "In use" },
						"String",
						{ count: 3, label: "uses" },
					],
				}}
			>
				<Section title="Contract">
					<Definitions />
				</Section>
				<Section
					title="Used by"
					read={reads.empty}
					empty={{
						sentence: "Nothing uses this field yet.",
						act: { label: "Add a use", onAct: act },
					}}
				/>
			</Pane>
		</>
	);
}

function Frame(props: { width: number; height: number }) {
	return (
		<div
			className="flex flex-col overflow-hidden"
			style={{ width: props.width, height: props.height }}
		>
			<Shell places={PLACES} switcher={SWITCHER}>
				<Standard />
			</Shell>
		</div>
	);
}

// 4. Layers: a toast stands in the Shell's layer, so it is drawn as the
// roster's own frame draws it, in a stage with its own queue.
const TOAST_AT_REST = showcaseFrames().find(
	(frame) =>
		frame.component === "Toast" && frame.cell.name === "TOAST_STATE.state.done",
);

function Layers() {
	return (
		<>
			<Banner
				tone="active"
				sentence="This standard is read-only in the Live context."
				act={{ label: "Open a change set", onAct: act }}
			/>
			{TOAST_AT_REST && drawToast(TOAST_AT_REST)}
		</>
	);
}

export const Face: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-pad p-pad">
			<Row>{() => <Controls />}</Row>
			<Row>
				{() => (
					<>
						<Fields />
						<Definitions />
					</>
				)}
			</Row>
			<Row>{() => <Frame width={1180} height={700} />}</Row>
			<Row>
				{() => (
					<div style={{ width: 720 }}>
						<Layers />
					</div>
				)}
			</Row>
		</div>
	),
};

// The phone frame at the touch density, which only the root pins.
export const FacePhone: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-pad p-pad">
			<Row>{() => <Frame width={320} height={640} />}</Row>
		</div>
	),
	tags: ["touch"],
	globals: { density: "touch" },
};
