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
		meta: ["b71d0e2", "Ana Ruiz"],
		trailing: { age: ago(40) },
		status: { tone: "failed", label: "Failed" },
		chip: { family: "red", label: "Rolled back" },
		more: MORE,
		href: "#web",
	},
	{
		key: "worker",
		leading: { icon: "Server" },
		title: "worker · main",
		meta: ["0c5e4aa", "Ema Okafor"],
		trailing: { age: ago(120) },
		status: { tone: "done", label: "Ready" },
		chip: { family: "teal", label: "Production" },
		more: MORE,
		href: "#worker",
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
			meta: ["ACM-142", "Billing"],
			trailing: { age: ago(120) },
			status: { tone: "active", label: "In progress" },
			href: location.pathname,
		},
		{
			key: "acm-139",
			leading: { avatar: { name: "Ema Okafor" } },
			title: "Export cohorts to CSV",
			meta: ["ACM-139", "Growth"],
			trailing: { age: ago(300) },
			status: { tone: "waiting", label: "Todo" },
			href: "#acm-139",
		},
		{
			key: "acm-137",
			leading: { avatar: { name: "Ana Ruiz" } },
			title: "Retry failed webhooks with backoff",
			meta: ["ACM-137", "Infra"],
			trailing: { age: ago(1440) },
			status: { tone: "attention", label: "Blocked" },
			href: "#acm-137",
		},
	];
}

// A member led by their invitation's state.
export const INVITES: Row[] = [
	{
		key: "lea",
		leading: { status: "waiting" },
		title: "lea@northwind.io",
		meta: ["Invited 2 d ago by Ana Ruiz"],
		href: "#lea",
	},
	{
		key: "omar",
		leading: { status: "done" },
		title: "omar@northwind.io",
		meta: ["Joined yesterday"],
		href: "#omar",
	},
];

// A job's stage led by its state: a steady one (a watch that stands) beside
// one under way, whose leading and status spin, and one still waiting. A stage
// that has run opens its output; the waiting one is a static row.
export const STAGES: Row[] = [
	{
		key: "watch",
		leading: { status: "active" },
		title: "Watch main",
		meta: ["Since Monday"],
		status: { tone: "active", label: "Watching" },
		href: "#watch",
	},
	{
		key: "rebase",
		leading: { status: "running" },
		title: "Rebasing on main",
		meta: ["Started 2 min ago"],
		status: { tone: "running", label: "Running" },
		href: "#rebase",
	},
	{
		key: "deploy",
		leading: { status: "waiting" },
		title: "Deploy to staging",
		meta: ["After the rebase"],
		status: { tone: "waiting", label: "Waiting" },
	},
];

// A note: its title over its meta, no leading.
export const NOTES: Row[] = [
	{ key: "kickoff", title: "Kickoff notes", meta: ["Edited 2 d ago"] },
	{ key: "retro", title: "Retro actions", meta: ["Edited last week"] },
];

// An implementation item carrying the next step as its act: ready, pending
// and blocked on a reason.
const step = (key: string, title: string, who: string, next: IconAct): Row => ({
	key,
	title,
	meta: ["Implementation", who],
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
		meta: ["+5 fields"],
		status: { tone: "done", label: "Passing" },
		warning: "Name conflicts with Checkout",
		lock: "Holds 3 fields",
		chip: { family: "amber", label: "Changed" },
		act: { label: "Resolve", icon: "Check", onAct: act },
		more: MORE,
	},
	{
		key: "invoice",
		leading: { icon: "FileDiff" },
		title: "Invoice export with the quarterly reconciliation",
		meta: ["+12 fields"],
		status: { tone: "failed", label: "Failing" },
		warning: "Stale since the last release of the billing schema",
		lock: "Holds 14 fields across two environments",
		chip: { family: "green", label: "Added" },
		act: { label: "Refresh", icon: "RefreshCw", onAct: act },
		more: MORE,
	},
];

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
	meta: [meta],
}));

// A journey's hops with the run's path highlighted: the rows on it at full
// contrast, the rest dimmed, each still a link.
const hops: RowItem[] = [
	{
		key: "signup",
		title: "Sign up",
		meta: ["Trigger"],
		status: { tone: "done", label: "Taken" },
	},
	{
		key: "welcome",
		title: "Send welcome email",
		meta: ["Email"],
		status: { tone: "done", label: "Taken" },
	},
	{
		key: "survey",
		title: "Ask for a survey",
		meta: ["Email"],
		status: { tone: "waiting", label: "Skipped" },
		dim: true,
	},
	{
		key: "upsell",
		title: "Offer the annual plan",
		meta: ["Banner"],
		status: { tone: "failed", label: "Failed" },
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
		meta: ["Trigger"],
		status: { tone: "done", label: "Taken" },
		href: "#tree-signup",
		children: [
			{
				key: "tree-paid",
				leading: { icon: "Workflow" },
				title: "Plan is paid",
				meta: ["Choice"],
				status: { tone: "done", label: "Taken" },
				href: "#tree-paid",
				children: [
					{
						key: "tree-welcome",
						leading: { icon: "Workflow" },
						title: "Send welcome email",
						meta: ["Email"],
						status: { tone: "done", label: "Taken" },
						href: "#tree-welcome",
					},
					{
						key: "tree-billing",
						leading: { icon: "Workflow" },
						title: "Add to the billing list",
						meta: ["Segment"],
						status: { tone: "running", label: "Running" },
						href: "#tree-billing",
					},
				],
			},
			{
				key: "tree-free",
				leading: { icon: "Workflow" },
				title: "Plan is free",
				meta: ["Choice"],
				dim: true,
				status: { tone: "waiting", label: "Skipped" },
				href: "#tree-free",
				children: [
					{
						key: "tree-survey",
						leading: { icon: "Workflow" },
						title: "Ask for a survey",
						meta: ["Email"],
						dim: true,
						status: { tone: "waiting", label: "Skipped" },
						href: "#tree-survey",
					},
					{
						key: "tree-upsell",
						leading: { icon: "Workflow" },
						title: "Offer the annual plan",
						meta: ["Banner"],
						dim: true,
						status: { tone: "failed", label: "Failed" },
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
		meta: ["Imported 2 min ago"],
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
		meta: ["Imported yesterday", "212 pages"],
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
		meta: [meta],
	}),
);

// An import source asking for its URL: its input and Import act on the row;
// the second row's address failed.
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
];

// The shapes a painted row can take: each part a row can hold, as the loaded
// row draws it and, beside it, painted.
export const SHAPES: Row[] = [
	{
		key: "0",
		leading: { avatar: { name: "Ana Ruiz" } },
		title: "Ana Ruiz",
		meta: ["ana@northwind.io", "Owner"],
		status: { tone: "done", label: "Active" },
		trailing: { age: ago(40) },
		more: MORE,
	},
	{
		key: "1",
		leading: { check: { checked: false, onChange: act } },
		title: "Review the invoice",
		meta: ["Due Friday"],
		warning: "Overdue",
		lock: "Held by CR-12",
		chip: { family: "neutral", label: "Billing" },
	},
	{
		key: "2",
		leading: { icon: "GitBranch" },
		title: "main",
		meta: ["a1b2c3d"],
		trailing: { count: 12 },
		act: { label: "Redeploy", icon: "RotateCw", onAct: act },
	},
	{
		key: "3",
		leading: { status: "running" },
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
		meta: ["Mail and links go out from it."],
		title: { status: "done", label: "Verified" },
		href: "#domain",
	},
	{
		label: "Contract end",
		meta: ["Renewal opens sixty days before it."],
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
// of words, a sentence label beside a switch, and two locked values, their
// reason a link to the request that holds one.
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
			meta: ["The API and the CLI address the workspace by it."],
			title: { code: "ws_7f3k9q2m4x", copy: true },
		},
		{ label: "Region", title: "Frankfurt (eu-central-1)", href: "#region" },
		{
			label: "Custom domain",
			meta: ["Mail and links go out from it."],
			title: { status, label: status === "done" ? "Verified" : undefined },
			href: "#domain",
		},
		{
			label: "Plan",
			meta: ["Your organisation manages it."],
			title: "Business",
		},
		{
			label: "Retention",
			meta: [
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
			meta: [
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
		{ label: "Billing cycle", pick: CYCLE },
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
		meta: ["Shown to every member."],
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
