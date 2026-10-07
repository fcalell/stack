import { ApiError } from "@fcalell/plugin-api/error";
import { defineFixtures } from "@fcalell/plugin-screens/fixtures";
import type { AppRouter } from "../../.stack/worker";
import { ago } from "./fixtures/ago.ts";
import { CHANGES, DEPLOYS, STEPS } from "./fixtures/deploys.ts";

type Day = AppRouter["usage"]["requests"]["__output"][number];
type Member = AppRouter["members"]["list"]["__output"][number];
type Turn = AppRouter["assistant"]["history"]["__output"][number];

// The record a procedure answers for an id; one nothing holds answers not found.
function found<T>(record: T | undefined): T {
	if (record === undefined) throw new ApiError("NOT_FOUND");
	return record;
}

// ── Projects: a column per stage ────────────────────────────────────

const STAGES = {
	building: [
		{ name: "acme-web", meta: "main · a41c9e2", age: ago(2) },
		{ name: "acme-api", meta: "main · 3f8b1d0", age: ago(6) },
	],
	preview: [
		{ name: "acme-docs", meta: "preview/search", age: ago(60) },
		{ name: "acme-admin", meta: "preview/roles", age: ago(180) },
		{ name: "acme-mail", meta: "preview/mjml", age: ago(1440) },
	],
	production: [
		{ name: "acme-cdn", meta: "main · e93a6c0", age: ago(1440) },
		{ name: "acme-status", meta: "main · 51aa7e3", age: ago(5760) },
	],
};

// ── Usage ───────────────────────────────────────────────────────────

// Build minutes a day, the last 30 days, the first and last day timed.
const MINUTES = [
	140, 160, 170, 150, 120, 110, 150, 170, 180, 160, 170, 120, 110, 160, 190,
	180, 170, 200, 130, 120, 170, 180, 210, 190, 180, 120, 110, 160, 170, 150,
];
const DAYS: Day[] = MINUTES.map((value, index) => {
	const day = new Date(Date.UTC(2026, 8, 3 + index)).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const end = index === 0 || index === MINUTES.length - 1;
	return { day, value, at: end ? day : undefined };
});

// Requests a day this week, by project.
const PROJECTS = ["acme-web", "acme-api", "acme-docs"];
const WEEK: Array<[string, number[]]> = [
	["Mon", [52_000, 31_000, 9_000]],
	["Tue", [61_000, 33_000, 8_000]],
	["Wed", [64_000, 41_000, 11_000]],
	["Thu", [58_000, 36_000, 14_000]],
	["Fri", [47_000, 30_000, 7_000]],
	["Sat", [21_000, 12_000, 4_000]],
	["Sun", [19_000, 10_000, 3_000]],
];
const REQUESTS: Day[] = WEEK.map(([day, values]) => ({
	day,
	value: values.reduce((sum, value) => sum + value, 0),
	parts: Object.fromEntries(
		PROJECTS.map((project, index) => [project, values[index] ?? 0]),
	),
	at: day,
}));

// ── Members ─────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
	{
		id: "ana",
		name: "Ana Ruiz",
		email: "ana@acme.dev",
		role: "owner",
		team: "Platform",
		deploys: true,
		active: ago(2),
	},
	{
		id: "ben",
		name: "Ben Kaya",
		email: "ben@acme.dev",
		role: "admin",
		team: "Web",
		deploys: true,
		active: ago(18),
	},
	{
		id: "ema",
		name: "Ema Okafor",
		email: "ema@acme.dev",
		role: "member",
		team: "Platform",
		deploys: true,
		active: ago(60),
	},
	{
		id: "chen",
		name: "Chen Wu",
		email: "chen@acme.dev",
		role: "viewer",
		team: "Design",
		deploys: false,
		active: ago(60 * 26),
	},
	{
		id: "dara",
		name: "Dara Novak",
		email: "dara.novak@acme.dev",
		role: "member",
		team: "",
		deploys: false,
		active: ago(60 * 24 * 9),
	},
];

// ── Assistant ───────────────────────────────────────────────────────

// A moment today at a clock time, as the ISO string a Message formats.
function today(time: string): string {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	const at = new Date();
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
}

const TURNS: Turn[] = [
	{
		id: "t1",
		author: "system",
		body: "Started from the failed deploy 0c5e4aa",
		at: today("09:53"),
		deploy: "d3",
	},
	{
		id: "t2",
		author: "you",
		body: "Why did the deploy of acme-web fail?",
		at: today("09:53"),
	},
	{
		id: "t3",
		author: "other",
		body: `The install failed: \`wrangler@4.12.0\` needs Node 20, and the build image is Node 18.

Pick one:

1. Move the build image to **Node 20** under Settings, then redeploy.
2. Pin \`wrangler\` back to \`^4.10.0\` in \`package.json\`.

Node 18 leaves the build images on Oct 12, so the first keeps working longer.`,
		at: today("09:54"),
	},
	{
		id: "t4",
		author: "you",
		body: "Move it to Node 20 and redeploy.",
		at: today("09:56"),
	},
	{
		id: "t5",
		author: "system",
		body: "Ana Ruiz redeployed a41c9e2",
		at: today("10:40"),
		deploy: "d1",
	},
	{
		id: "t6",
		author: "other",
		body: "The redeploy is building on Node 20. The install restored its cache, so it should be ready in about two minutes.",
		at: today("10:41"),
	},
];

// The data of every procedure the app calls, and an example value for each
// route `$param`: the screens workbench answers from these.
export default defineFixtures<AppRouter>(
	{
		deploys: {
			list: () => DEPLOYS,
			get: ({ id }) => {
				const deploy = found(DEPLOYS.find((each) => each.id === id));
				const { description, notes } = found(CHANGES[id]);
				return { ...deploy, description, notes, steps: STEPS };
			},
			files: ({ id }) => found(CHANGES[id]).files,
			log: ({ id }) => found(CHANGES[id]).log,
			remove: () => undefined,
			removePreviews: () => undefined,
		},
		projects: { list: ({ stage }) => STAGES[stage] },
		usage: {
			meters: () => [
				{
					label: "Requests",
					value: 412_000,
					max: 1_000_000,
					unit: "requests",
					meta: "412,000 of 1M requests",
				},
				{
					label: "Build minutes",
					value: 5_640,
					max: 6_000,
					unit: "minutes",
					meta: "5,640 of 6,000 minutes, 360 left",
				},
				{
					label: "Storage",
					value: 11.8,
					max: 10,
					unit: "GB",
					meta: "1.8 GB over, billed at the end of the month",
				},
			],
			requests: () => REQUESTS,
			minutes: () => DAYS,
			// None ran this week.
			cron: () => [],
			plan: () => [
				{ label: "Requests", values: ["1M a month", "10M a month"] },
				{ label: "Build minutes", values: ["6,000 a month", "25,000 a month"] },
				{ label: "Storage", values: ["10 GB", "100 GB"] },
				{ label: "Audit log", values: ["Not included", "Kept 90 days"] },
				{
					label: "Billed",
					values: ["$120 a month", "$480 a month, from Oct 14"],
				},
			],
			upgrade: () => undefined,
		},
		domains: {
			list: () => [
				{
					name: "acme.dev",
					state: "done",
					meta: "Primary · certificate valid",
				},
				{
					name: "www.acme.dev",
					state: "done",
					meta: "Redirects to acme.dev",
				},
				{ name: "shop.acme.dev", state: "waiting", meta: "Waiting for DNS" },
			],
			verify: () => undefined,
		},
		assistant: { history: () => TURNS },
		tasks: {
			list: () => [
				{
					id: "k1",
					title: "Review the failed deploy of acme-web",
					meta: "Today",
				},
				{
					id: "k2",
					title: "Renew the acme.dev certificate",
					meta: "In 3 days",
				},
				{
					id: "k3",
					title: "Invite the new on-call engineer",
					meta: "This week",
				},
				{
					id: "k4",
					title: "Move the build image to Node 20",
					meta: "Next week",
				},
				{
					id: "k5",
					title: "Prune the stale preview deploys",
					meta: "Next week",
				},
			],
		},
		members: {
			list: () => MEMBERS,
			update: ({ id, ...change }) => ({
				...found(MEMBERS.find((each) => each.id === id)),
				...change,
			}),
			// The new owner takes ownership, the old one stays an admin.
			transfer: ({ id }) =>
				MEMBERS.map((member): Member => {
					if (member.id === id) return { ...member, role: "owner" };
					if (member.role === "owner") return { ...member, role: "admin" };
					return member;
				}),
			invite: () => undefined,
			revokeInvitation: () => undefined,
		},
		settings: {
			general: () => ({
				name: "Acme",
				slug: "acme",
				about:
					"Production and preview deploys for the Acme storefront and its API.",
				region: "fra",
			}),
			save: () => undefined,
		},
		devices: {
			list: () => ["Ana's Pixel 9"],
			unpair: () => undefined,
		},
		account: {
			request: () => ({ email: "ana@acme.dev" }),
			sendCode: () => undefined,
			verify: () => undefined,
		},
		workspaces: {
			list: () => [
				{ name: "Acme", meta: "12 members" },
				{ name: "Globex", meta: "4 members" },
				{ name: "Initech", meta: "31 members" },
			],
		},
	},
	{ deployId: "d1", stepId: "install" },
);
