import type {
	FileItem,
	IconAct,
	MenuEntry,
	RowItem,
} from "@fcalell/ui-core/descriptors";
import type { Row } from "../../components/section/index.tsx";
import { ago } from "../ago.ts";
import { hang } from "./pending.tsx";

// The rows the Section frames draw, as literals of the descriptors a consumer
// builds from its records: one list per kind of row a cell names.

export const act = () => {};

const MORE: MenuEntry[] = [
	{ label: "Redeploy", icon: "RotateCw", onAct: act },
	{ label: "Copy URL", icon: "Copy", onAct: act },
];

// A deploy: its glyph leading, its commit naming it on the meta line with its
// environment chip at the line's end, its age over its status in the end
// group, its acts.
export const DEPLOYS: Row[] = [
	{
		key: "web",
		leading: { icon: "GitBranch" },
		title: "web · fix/checkout",
		facts: [
			{ tone: "failed", label: "Failed" },
			{ family: "red", label: "Rolled back" },
			"b71d0e2",
			"Ana Ruiz",
		],
		trailing: { age: ago(40) },
		more: MORE,
		href: "#web",
	},
	{
		key: "worker",
		leading: { icon: "Server" },
		title: "worker · main",
		facts: [
			{ tone: "done", label: "Ready" },
			{ family: "teal", label: "Production" },
			"0c5e4aa",
			"Ema Okafor",
		],
		trailing: { age: ago(120) },
		more: MORE,
		href: "#worker",
	},
	// A status mark with no words (a dot alone) leads its meta line with no
	// separator after it.
	{
		key: "api",
		leading: { icon: "Server" },
		title: "api · main",
		facts: [{ tone: "running", label: "" }, "e19a3f7", "Ana Ruiz"],
		trailing: { age: ago(5) },
		more: MORE,
		href: "#api",
	},
];

// Board 40's issues in a list Pane: the first row current (its href is the
// page's own path), the others at their own.
export function issues(): Row[] {
	return [
		{
			key: "acm-142",
			leading: { avatar: { name: "Ben Kaya" } },
			title: "Fix invoice rounding",
			facts: [{ tone: "active", label: "In progress" }, "ACM-142", "Billing"],
			trailing: { age: ago(120) },
			href: location.pathname,
		},
		{
			key: "acm-139",
			leading: { avatar: { name: "Ema Okafor" } },
			title: "Export cohorts to CSV",
			facts: [{ tone: "waiting", label: "Todo" }, "ACM-139", "Growth"],
			trailing: { age: ago(300) },
			href: "#acm-139",
		},
		{
			key: "acm-137",
			leading: { avatar: { name: "Ana Ruiz" } },
			title: "Retry failed webhooks with backoff",
			facts: [{ tone: "attention", label: "Blocked" }, "ACM-137", "Infra"],
			trailing: { age: ago(1440) },
			href: "#acm-137",
		},
	];
}

// A member led by their invitation's state.
export const INVITES: Row[] = [
	{
		key: "lea",
		leading: { tone: "waiting" },
		title: "lea@northwind.io",
		facts: ["Invited 2 d ago by Ana Ruiz"],
		href: "#lea",
	},
	{
		key: "omar",
		leading: { tone: "done" },
		title: "omar@northwind.io",
		facts: ["Joined yesterday"],
		href: "#omar",
	},
];

// A job's stage led by its state: a steady one (a watch that stands) beside
// one under way, whose leading and status spin, and one still waiting. A stage
// that has run opens its output; the waiting one is a static row.
export const STAGES: Row[] = [
	{
		key: "watch",
		leading: { tone: "active" },
		title: "Watch main",
		facts: [{ tone: "active", label: "Watching" }, "Since Monday"],
		href: "#watch",
	},
	{
		key: "rebase",
		leading: { tone: "running" },
		title: "Rebasing on main",
		facts: [{ tone: "running", label: "Running" }, "Started 2 min ago"],
		href: "#rebase",
	},
	{
		key: "deploy",
		leading: { tone: "waiting" },
		title: "Deploy to staging",
		facts: [{ tone: "waiting", label: "Waiting" }, "After the rebase"],
	},
];

// A note: its title over its facts, no leading.
export const NOTES: Row[] = [
	{ key: "kickoff", title: "Kickoff notes", facts: ["Edited 2 d ago"] },
	{ key: "retro", title: "Retro actions", facts: ["Edited last week"] },
];

// An implementation item carrying the next step as its act: ready, pending
// and blocked on a reason.
const step = (key: string, title: string, who: string, next: IconAct): Row => ({
	key,
	title,
	facts: ["Implementation", who],
	act: next,
	more: MORE,
});

export const STEPS: Row[] = [
	step("staging", "Checkout redesign", "Ana Ruiz", {
		label: "Claim staging",
		icon: "Flag",
		onAct: act,
	}),
	step("review", "Invoice export", "Ben Kaya", {
		label: "Request review",
		icon: "Eye",
		onAct: hang,
	}),
	step("release", "Webhook retries", "Ema Okafor", {
		label: "Release",
		icon: "Rocket",
		onAct: act,
		blocked: "Staging is not claimed.",
	}),
];

// A change set entry carrying every mark at once: its count a meta part, its
// status in the end group, a warning (the act that clears it the row's own), the
// lock it holds and its change chip; the second row's marks are long enough to
// yield.
export const ENTRIES: Row[] = [
	{
		key: "checkout",
		leading: { icon: "FileDiff" },
		title: "Checkout redesign",
		facts: [
			{ tone: "done", label: "Passing" },
			{ warning: "Name conflicts with Checkout" },
			{ family: "amber", label: "Changed" },
			"+5 fields",
		],
		lock: "Holds 3 fields",
		act: { label: "Resolve", icon: "Check", onAct: act },
		more: MORE,
	},
	{
		key: "invoice",
		leading: { icon: "FileDiff" },
		title: "Invoice export with the quarterly reconciliation",
		facts: [
			{ tone: "failed", label: "Failing" },
			{ warning: "Stale since the last release of the billing schema" },
			{ family: "green", label: "Added" },
			"+12 fields",
		],
		lock: "Holds 14 fields across two environments",
		act: { label: "Refresh", icon: "RefreshCw", onAct: act },
		more: MORE,
	},
];

// A path long enough to wrap at 320, one segment of it a long word.
const MAIL_PATH =
	"plugins/lead-mail/src/connectors/gmail/refreshTokenRotationScheduleHandler.ts";
const OUTSIDE = {
	flag: "Globe",
	label: "Outside content",
	words: false,
} as const;
const REQUIRED = { ring: true, label: "Required", words: false } as const;

// A row's boolean marks. A mark whose words are not drawn (`words: false`)
// stands as a glyph in the end group before the age, named by its label: the
// first row is one line with a status only in a room, the second, with no
// status, has no mark in its meta line, the third carries two glyphs and a
// long meta, and the fourth a path part that wraps whole beside a status and a
// failing mark. A mark with words (the last two) keeps them in the meta line,
// the glyph and its word, a gap apart, wrapping as the line does; the last
// carries every mark kind at once.
export const MARKS: Row[] = [
	{
		key: "needs",
		leading: { icon: "Inbox" },
		title: "Land the checkout change",
		facts: [{ tone: "waiting", label: "Waiting for you" }, OUTSIDE],
		trailing: { age: ago(5) },
		href: "#needs",
	},
	{
		key: "quiet",
		leading: { icon: "Inbox" },
		title: "Read the vendor changelog",
		facts: [OUTSIDE],
		trailing: { age: ago(30) },
		href: "#quiet",
	},
	{
		key: "meta",
		leading: { icon: "Inbox" },
		title: "Review the nightly migration of the ledger tables",
		facts: [
			OUTSIDE,
			REQUIRED,
			"Code",
			"Job",
			"raised from the nightly migration of the ledger",
		],
		trailing: { age: ago(60) },
		href: "#meta",
	},
	{
		key: "path",
		leading: { icon: "FileWarning" },
		title: "Refresh the mail connector",
		facts: [
			{ tone: "failed", label: "Failed" },
			OUTSIDE,
			"worker",
			{ code: MAIL_PATH },
		],
		trailing: { age: ago(3) },
		href: "#path",
	},
	{
		// A name that is a sentence, beside a glyph and an age: at 320 it stands
		// whole on its lines, never cut to its first words.
		key: "sentence",
		leading: { icon: "OctagonX" },
		title: "Stopped: the classifier blocked a call",
		facts: [OUTSIDE, "Stead"],
		trailing: { age: ago(23) },
		href: "#sentence",
	},
	{
		key: "words",
		leading: { icon: "Database" },
		title: "Export the customer table",
		facts: [
			{ flag: "ShieldAlert", label: "Personal data" },
			{ ring: true, label: "Required" },
			"billing",
			"Ana Ruiz",
		],
		trailing: { age: ago(120) },
		href: "#words",
	},
	{
		key: "full",
		leading: { icon: "Database" },
		title: "Rotate the signing keys",
		facts: [
			{ tone: "attention", label: "Needs your approval" },
			{ warning: "Name conflicts with Checkout" },
			{ family: "amber", label: "Changed" },
			{
				flag: "ShieldAlert",
				label: "Personal data of the customers' households",
			},
			{ ring: true, label: "Required" },
			OUTSIDE,
			"security",
			{ code: MAIL_PATH },
		],
		lock: "Holds 3 fields",
		trailing: { age: ago(240) },
		act: { label: "Resolve", icon: "Check", onAct: act },
		more: MORE,
		href: "#full",
	},
];

// The records `MARKS`' first row stands on, as a feed of items gives them: the
// waiting form takes its shape from the one row such a mapping gives a sample
// record, whose status is a slot with nothing in it.
export interface Item {
	id: string;
	title: string;
	parts: string[];
	status?: { tone: "waiting" | "attention"; label: string };
	outside: boolean;
	age: string;
}

export const ITEMS: Item[] = [
	{
		id: "item-1",
		title: "Land the checkout change",
		parts: ["Code", "Job"],
		status: { tone: "waiting", label: "Waiting for you" },
		outside: true,
		age: ago(5),
	},
	{
		id: "item-2",
		title: "Approve the vendor contract",
		parts: ["Code"],
		status: { tone: "attention", label: "Needs your approval" },
		outside: false,
		age: ago(25),
	},
];

/** An item as a feed maps it to a row: the status when it has one, the outside mark as a glyph in the end group. */
export const rowOf = (item: Item): Row => ({
	key: item.id,
	leading: { icon: "Inbox" },
	title: item.title,
	facts: [
		...(item.status ? [item.status] : []),
		...(item.outside ? [OUTSIDE] : []),
		...item.parts,
	],
	trailing: { age: item.age },
	href: `#${item.id}`,
});

// A change set: each row where it stands, one of every kind, with a leading
// glyph so the mark is seen ahead of it.
export const CHANGES: Row[] = (
	[
		["intake", "added", "Intake form", "Step 1"],
		["review", "changed", "Review", "Step 2"],
		["legacy", "removed", "Manual approval", "Step 3"],
		["notify", "unchanged", "Notify", "Step 4"],
		["archive", "stale", "Archive", "Step 5"],
	] as const
).map(([key, change, title, meta]) => ({
	key,
	change,
	leading: { icon: "Workflow" },
	title,
	facts: [meta],
}));

// A journey's hops with the run's path highlighted: the rows on it at full
// contrast, the rest dimmed, each still a link.
const hops: RowItem[] = [
	{
		key: "signup",
		title: "Sign up",
		facts: [{ tone: "done", label: "Taken" }, "Trigger"],
	},
	{
		key: "welcome",
		title: "Send welcome email",
		facts: [{ tone: "done", label: "Taken" }, "Email"],
	},
	{
		key: "survey",
		title: "Ask for a survey",
		facts: [{ tone: "waiting", label: "Skipped" }, "Email"],
		dim: true,
	},
	{
		key: "upsell",
		title: "Offer the annual plan",
		facts: [{ tone: "failed", label: "Failed" }, "Banner"],
		dim: true,
	},
];

export const HOPS: Row[] = hops.map(
	(hop): Row => ({
		...hop,
		leading: { icon: "Workflow" },
		href: `#${hop.key}`,
	}),
);

// A branching journey as a tree of three levels: a choice point's legs under
// it, a leg's steps under that, the leg off the run's path dimmed whole.
export const LEGS: Row[] = [
	{
		key: "tree-signup",
		leading: { icon: "Workflow" },
		title: "Sign up",
		facts: [{ tone: "done", label: "Taken" }, "Trigger"],
		href: "#tree-signup",
		children: [
			{
				key: "tree-paid",
				leading: { icon: "Workflow" },
				title: "Plan is paid",
				facts: [{ tone: "done", label: "Taken" }, "Choice"],
				href: "#tree-paid",
				children: [
					{
						key: "tree-welcome",
						leading: { icon: "Workflow" },
						title: "Send welcome email",
						facts: [{ tone: "done", label: "Taken" }, "Email"],
						href: "#tree-welcome",
					},
					{
						key: "tree-billing",
						leading: { icon: "Workflow" },
						title: "Add to the billing list",
						facts: [{ tone: "running", label: "Running" }, "Segment"],
						href: "#tree-billing",
					},
					// A one-line leaf: its rail runs on through the hairlines.
					{
						key: "tree-receipt",
						leading: { icon: "Workflow" },
						title: "Send the receipt",
						href: "#tree-receipt",
					},
				],
			},
			{
				key: "tree-free",
				leading: { icon: "Workflow" },
				title: "Plan is free",
				facts: [{ tone: "waiting", label: "Skipped" }, "Choice"],
				dim: true,
				href: "#tree-free",
				children: [
					{
						key: "tree-survey",
						leading: { icon: "Workflow" },
						title: "Ask for a survey",
						facts: [{ tone: "waiting", label: "Skipped" }, "Email"],
						dim: true,
						href: "#tree-survey",
					},
					{
						key: "tree-upsell",
						leading: { icon: "Workflow" },
						title: "Offer the annual plan",
						facts: [{ tone: "failed", label: "Failed" }, "Banner"],
						dim: true,
						href: "#tree-upsell",
					},
				],
			},
		],
	},
];

// An import whose act pends: its steps stand in its meta line's place, one
// done, one running, one waiting; the settled row below gives its meta back.
export const IMPORTS: Row[] = [
	{
		key: "docs",
		leading: { icon: "Globe" },
		title: "Documentation site",
		facts: ["Imported 2 min ago"],
		steps: [
			{ tone: "done", label: "Fetched 48 pages" },
			{ tone: "running", label: "Reading the pages" },
			{ tone: "waiting", label: "Indexing" },
		],
		act: { label: "Import", icon: "Download", onAct: hang },
		more: MORE,
	},
	{
		key: "help",
		leading: { icon: "Globe" },
		title: "Help centre",
		facts: ["Imported yesterday", "212 pages"],
		act: { label: "Import", icon: "Download", onAct: act },
		more: MORE,
	},
];

// A change set entry the viewer ticks to publish: one ticked, one not, one
// that cannot be ticked, its reason leading its meta line.
export const TICKS: Row[] = (
	[
		["checkout", "Checkout redesign", "+5 fields", true],
		["invoice", "Invoice export", "+12 fields", false],
		["legacy", "Manual approval", "Removed", false, "Held by CR-12, Ana"],
	] as const
).map(
	([key, title, meta, checked, blocked]): Row => ({
		key,
		leading: { check: { checked, onChange: act, blocked } },
		title,
		facts: [meta],
	}),
);

// An import source asking for its URL: its input and Import act on the row;
// the second row's address failed; the third row's act is long, so on a line
// too narrow for both it stands under the input, its label whole; the fourth
// row's address failed beside that long act, so its refusal stands under the
// input, between it and the act that wrapped.
export const SOURCES: Row[] = [
	{
		key: "docs",
		leading: { icon: "Globe" },
		title: "Documentation site",
		entry: {
			label: "Documentation URL",
			field: { value: "", onChange: act },
			placeholder: "https://docs.acme.app",
			act: { label: "Import", onAct: act },
		},
	},
	{
		key: "help",
		leading: { icon: "Globe" },
		title: "Help centre",
		entry: {
			label: "Help centre URL",
			field: { value: "help.acme", onChange: act },
			act: { label: "Import", onAct: act },
			error: "Enter a full address starting with https://.",
		},
	},
	{
		key: "status",
		leading: { icon: "Globe" },
		title: "Status page",
		entry: {
			label: "Status page domain",
			field: { value: "", onChange: act },
			placeholder: "status.acme.app",
			act: { label: "Use this custom domain", onAct: act },
		},
	},
	{
		key: "status-refused",
		leading: { icon: "Globe" },
		title: "Status page, refused",
		entry: {
			label: "Refused status page domain",
			field: { value: "https://status.acme", onChange: act },
			act: { label: "Use this custom domain", onAct: act },
			error: "Enter the domain alone, with no https://.",
		},
	},
];

// The shapes a painted row can take: each part a row can hold, as the loaded
// row draws it and, beside it, painted.
export const SHAPES: Row[] = [
	{
		key: "0",
		leading: { avatar: { name: "Ana Ruiz" } },
		title: "Ana Ruiz",
		facts: [{ tone: "done", label: "Active" }, "ana@northwind.io", "Owner"],
		trailing: { age: ago(40) },
		more: MORE,
	},
	{
		key: "1",
		leading: { check: { checked: false, onChange: act } },
		title: "Review the invoice",
		facts: [
			{ warning: "Overdue" },
			{ family: "neutral", label: "Billing" },
			"Due Friday",
		],
		lock: "Held by CR-12",
	},
	{
		key: "2",
		leading: { icon: "GitBranch" },
		title: "main",
		facts: ["a1b2c3d"],
		trailing: { count: 12 },
		act: { label: "Redeploy", icon: "RotateCw", onAct: act },
	},
	{
		key: "3",
		leading: { tone: "running" },
		title: "Build",
		steps: [
			{ tone: "done", label: "Install" },
			{ tone: "running", label: "Compile" },
		],
	},
	{
		key: "4",
		title: "Import a repository",
		entry: {
			label: "Repository URL",
			field: { value: "", onChange: act, onCommit: act },
			placeholder: "github.com/acme/api",
			act: { label: "Import", onAct: act },
		},
	},
	// A device's row: its age and its pick stand whole at the row's end, the
	// title giving way to them.
	{
		key: "5",
		leading: { icon: "Lightbulb" },
		title: "Bathroom ceiling light",
		facts: ["Bathroom"],
		trailing: { age: ago(0.65) },
		pick: {
			label: "Bathroom ceiling light",
			options: [
				{ value: "off", label: "Off" },
				{ value: "on", label: "On" },
			],
			value: "off",
			onChange: act,
		},
	},
];

// A fact picked in place.
const CYCLE = {
	label: "Billing cycle",
	options: [
		{ value: "monthly", label: "Monthly" },
		{ value: "yearly", label: "Yearly" },
	],
	value: "monthly",
	onChange: act,
};

// The facts of a card, as loaded or painted; a painted row paints each part
// of what it is given (a description, an act, a link, a control).
export const FACTS: Row[] = [
	{ label: "Plan", title: "Business" },
	{
		label: "Workspace name",
		title: "Acme",
		act: { icon: "Pencil", label: "Rename", onAct: act },
	},
	{ label: "Workspace ID", title: { code: "ws_7f3k9q2m4x", copy: true } },
	{
		label: "Custom domain",
		facts: ["Mail and links go out from it."],
		title: { tone: "done", label: "Verified" },
		href: "#domain",
	},
	{
		label: "Contract end",
		facts: ["Renewal opens sixty days before it."],
		title: "31 Dec 2026",
		lock: { reason: "Held by CR-12, Ana", href: "/requests/cr-12" },
	},
	{
		label: "Notify on failure",
		switch: { checked: true, onChange: act },
	},
	{ label: "Billing cycle", pick: CYCLE },
];

// Board 40's settings: an act, a copyable code value under a description, a
// link, a status under a description, a row with neither act nor link, a value
// of words, a sentence label beside a switch, two locked values, their
// reason a link to the request that holds one, and a described pick.
export function settings(
	status:
		| "done"
		| "waiting"
		| "active"
		| "attention"
		| "failed"
		| "idle"
		| "running",
): Row[] {
	return [
		{
			label: "Workspace name",
			title: "Acme",
			act: { icon: "Pencil", label: "Rename", onAct: act },
		},
		{
			label: "Workspace ID",
			facts: ["The API and the CLI address the workspace by it."],
			title: { code: "ws_7f3k9q2m4x", copy: true },
		},
		{ label: "Region", title: "Frankfurt (eu-central-1)", href: "#region" },
		{
			label: "Custom domain",
			facts: ["Mail and links go out from it."],
			title: {
				tone: status,
				label: status === "done" ? "Verified" : undefined,
			},
			href: "#domain",
		},
		{
			label: "Plan",
			facts: ["Your organisation manages it."],
			title: "Business",
		},
		{
			label: "Retention",
			facts: [
				"How long a deleted workspace, its members, its history and every file it held stay recoverable before they are removed for good; after that date nothing can bring them back.",
			],
			title: "30 days",
		},
		{
			label: "Contract end",
			title: "31 Dec 2026",
			lock: { reason: "Held by CR-12, Ana", href: "#cr-12" },
		},
		{
			label: "Contract renewal",
			facts: [
				"Renewal opens sixty days before the contract ends and closes a week after.",
			],
			title: "1 Nov 2026",
			lock: { reason: "Held by CR-12, Ana", href: "/requests/cr-12" },
		},
		{
			label: "Billing contact",
			title: "ana@acme.test",
			lock: { reason: "Set by your organisation" },
		},
		{ label: "Expected spend", title: "No history yet" },
		{
			label: "Only what changed since you last looked",
			switch: { checked: true, onChange: act },
		},
		{
			label: "Billing cycle",
			facts: ["When the invoice is drawn and the card charged."],
			pick: CYCLE,
		},
	];
}

// A change set's facts, one of every kind.
export const FACT_CHANGES: Row[] = [
	{ change: "changed", label: "Region", title: "Frankfurt (eu-central-1)" },
	{ change: "added", label: "Custom domain", title: "acme.app" },
	{ change: "removed", label: "Fallback region", title: "Dublin" },
	{
		change: "unchanged",
		label: "Workspace name",
		facts: ["Shown to every member."],
		title: "Acme",
	},
	{ change: "stale", label: "Plan", title: "Business" },
];

const LONG = "docs/billing/payment-terms-and-late-invoices.md";

// Board 51's review list at a list Pane's width, the long path cut.
const file = (item: Omit<FileItem, "key">, prefix = ""): Row => ({
	key: prefix + item.path,
	...item,
});

export const REVIEW: Row[] = (
	[
		{
			path: "src/billing/invoice.ts",
			added: 4,
			removed: 2,
			seen: true,
			href: "#invoice",
		},
		{
			path: "src/billing/terms.ts",
			added: 7,
			removed: 0,
			seen: false,
			href: "#terms",
		},
		{
			path: "src/billing/invoice.test.ts",
			added: 18,
			removed: 3,
			seen: false,
			href: "#invoice-test",
		},
		{ path: LONG, added: 2, removed: 1, seen: false, href: "#docs" },
	] satisfies Omit<FileItem, "key">[]
).map((item) => file(item));

// A chip beside a short name at the touch width: the directory goes first, the
// name never loses its start, and the chip's label truncates before the path
// goes below it.
export const CHIPPED: Row[] = (
	[
		{
			path: "biome.json",
			added: 12,
			removed: 4,
			seen: false,
			href: "#biome",
			chip: { family: "amber", label: "what the check reads" },
		},
		{
			path: "docs/flags.md",
			added: 3,
			removed: 0,
			seen: false,
			href: "#flags",
			chip: { family: "teal", label: "knowledge text" },
		},
		{
			path: LONG,
			added: 2,
			removed: 1,
			seen: false,
			href: "#terms-docs",
			chip: { family: "amber", label: "what the check reads" },
		},
	] satisfies Omit<FileItem, "key">[]
).map((item) => file(item, "chip-"));

// The seen marks given, then absent (the file glyph).
export const FILES: Row[] = (
	[
		{
			path: "src/billing/terms.ts",
			added: 7,
			removed: 0,
			seen: false,
			href: "#terms",
		},
		{
			path: "src/billing/invoice.ts",
			added: 4,
			removed: 2,
			seen: true,
			href: "#invoice",
		},
		{
			path: "src/billing/invoice.test.ts",
			added: 18,
			removed: 3,
			href: "#invoice-test",
		},
		{ path: LONG, added: 2, removed: 1, href: "#docs" },
	] satisfies Omit<FileItem, "key">[]
).map((item) => file(item));

// The open file's row current (its href is the page's own path) between two
// that open elsewhere.
export function openFiles(): Row[] {
	return (
		[
			{
				path: "src/billing/invoice.ts",
				added: 4,
				removed: 2,
				seen: true,
				href: "#invoice",
			},
			{
				path: "src/billing/terms.ts",
				added: 7,
				removed: 0,
				seen: true,
				href: location.pathname,
			},
			{
				path: "src/billing/invoice.test.ts",
				added: 18,
				removed: 3,
				seen: false,
				href: "#invoice-test",
			},
		] satisfies Omit<FileItem, "key">[]
	).map((item) => file(item));
}

// Host keys: facts from data, a label over its fingerprint, copied.
export const HOST_KEYS: Row[] = [
	{
		key: "k1",
		label: "ED25519",
		title: {
			code: "SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s",
			copy: true,
		},
	},
	{
		key: "k2",
		label: "RSA",
		title: {
			code: "SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8",
			copy: true,
		},
	},
	{
		key: "k3",
		label: "ECDSA",
		title: {
			code: "SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM",
			copy: true,
		},
	},
];

// A fact's copyable code is read to its end, as a definition is: whole on as
// many lines as it takes, at a URL's or a path's separators first, then
// anywhere (a fingerprint), never cut in its middle. The first is a command
// line that wraps at its spaces and its URL, the second a path past any width
// at 320, one segment of it a long word.
export const SERVER: Row[] = [
	{
		key: "line",
		label: "Command line",
		title: {
			code: "npx ledger-mcp --stdio --upload https://paste.example/ledger/v2/exports",
			copy: true,
		},
	},
	{
		key: "directory",
		label: "Directory",
		title: {
			code: "../catalog/catalog/lead-mail/packages/refreshTokenRotationScheduleHandler/home",
			copy: true,
		},
	},
];

export const HOSTS: Row[] = [
	{ key: "h1", title: "docs.example.org" },
	{ key: "h2", title: "api.example.org" },
];

export const WORKSPACES: Row[] = [
	{ key: "w1", title: "Production" },
	{ key: "w2", title: "Staging" },
	{ key: "w3", title: "Previews" },
];

export const PEOPLE: Row[] = [
	{ key: "Ana Ruiz", title: "Ana Ruiz" },
	{ key: "Ben Kaya", title: "Ben Kaya" },
	{ key: "Ema Okafor", title: "Ema Okafor" },
];
