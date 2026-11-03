// The work: the tasks, the queue in the order they are done, and the boards the
// tasks are dropped on.
export interface Task {
	id: string;
	title: string;
	owner: string;
	points: number;
	label: string;
}

export const TASKS: readonly Task[] = [
	{
		id: "t1",
		title: "Write release notes",
		owner: "Ana Ruiz",
		points: 3,
		label: "docs",
	},
	{
		id: "t2",
		title: "Fix login redirect",
		owner: "Ben Kaya",
		points: 5,
		label: "bug",
	},
	{
		id: "t3",
		title: "Archive old logs",
		owner: "Ema Okafor",
		points: 2,
		label: "ops",
	},
	{
		id: "t4",
		title: "Add dark mode",
		owner: "Ana Ruiz",
		points: 8,
		label: "feature",
	},
	{
		id: "t5",
		title: "Rotate API keys",
		owner: "Ben Kaya",
		points: 3,
		label: "ops",
	},
	{
		id: "t6",
		title: "Update pricing page",
		owner: "Ema Okafor",
		points: 2,
		label: "docs",
	},
	{
		id: "t7",
		title: "Speed up search",
		owner: "Ana Ruiz",
		points: 13,
		label: "feature",
	},
	{
		id: "t8",
		title: "Fix upload timeout",
		owner: "Ben Kaya",
		points: 5,
		label: "bug",
	},
	{
		id: "t9",
		title: "Plan the offsite",
		owner: "Ema Okafor",
		points: 1,
		label: "team",
	},
	{
		id: "t10",
		title: "Review invoices",
		owner: "Ana Ruiz",
		points: 2,
		label: "team",
	},
	{
		id: "t11",
		title: "Migrate billing",
		owner: "Ben Kaya",
		points: 8,
		label: "feature",
	},
	{
		id: "t12",
		title: "Clean up the wiki",
		owner: "Ema Okafor",
		points: 1,
		label: "docs",
	},
];

// The boards, in folders to any depth: a node with `folder` is a folder.
export interface BoardNode {
	id: string;
	label: string;
	folder?: readonly BoardNode[];
}

export const BOARD_TREE: readonly BoardNode[] = [
	{ id: "someday", label: "Someday" },
	{
		id: "teams",
		label: "Teams",
		folder: [
			{ id: "web", label: "Web" },
			{ id: "platform", label: "Platform" },
			{
				id: "launch",
				label: "Launch",
				folder: [{ id: "beta", label: "Beta" }],
			},
		],
	},
];

const leaves = (nodes: readonly BoardNode[]): BoardNode[] =>
	nodes.flatMap((node) => (node.folder ? leaves(node.folder) : [node]));

/** The boards a task can be added to: the tree's leaves. */
export const BOARDS = leaves(BOARD_TREE);
