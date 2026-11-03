// The sprints tasks are filed under, the tasks in them and who each can be
// assigned to.
export const BANDS = [
	{ key: "s1", label: "Sprint 1" },
	{ key: "s2", label: "Sprint 2" },
	{ key: "s3", label: "Sprint 3" },
];

export const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
	{ value: "ema", label: "Ema Okafor" },
];

export const SPRINT_TASKS = [
	["c1", "Write release notes", "Docs", "s1", "ana"],
	["c2", "Fix login redirect", "Auth", "s1", "ben"],
	["c3", "Archive old logs", "Ops", "s1", "ana"],
	["c4", "Add dark mode", "Web", "s2", "ema"],
	["c5", "Rotate API keys", "Ops", "s2", "ben"],
	["c6", "Update pricing page", "Docs", "s2", "ana"],
	["c7", "Speed up search", "Web", "s3", "ema"],
	["c8", "Migrate billing", "Platform", "s3", "ben"],
].map(([id, title, area, sprint, owner]) => ({
	id: String(id),
	title: String(title),
	area: String(area),
	sprint: String(sprint),
	owner: String(owner),
}));
