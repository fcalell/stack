import { pathOrder } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPath,
} from "@fcalell/ui-core/descriptors";

// The two graphs the canvas is shown and tested with, as plain data so a node
// test reads them.

export interface Graph {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
	groups?: CanvasGroup[];
	path?: CanvasPath;
}

// A workflow: a loop in a group, a gate's answer going back upstream, and a
// handoff to another team. No node has a position, so the canvas places them.
export const WORKFLOW: Graph = {
	nodes: [
		{
			id: "start",
			icon: "Play",
			overline: "Trigger",
			title: "Start",
			line: "Every weekday",
		},
		{
			id: "plan",
			icon: "ListChecks",
			overline: "Plan",
			title: "Draft a plan",
			line: "Writes the steps",
		},
		{
			id: "build",
			icon: "Hammer",
			overline: "Build",
			title: "Make the change",
			line: "Edits the files",
		},
		{
			id: "check",
			icon: "ShieldCheck",
			overline: "Check",
			title: "Run the checks",
			line: "Tests and lint",
			count: 3,
		},
		{
			id: "gate",
			icon: "GitBranch",
			overline: "Gate",
			title: "Is it green?",
			line: "Pass or send back",
		},
		{
			id: "review",
			icon: "Eye",
			overline: "Review",
			title: "Review",
			line: "Reads the changes",
		},
		{
			id: "handoff",
			icon: "Send",
			overline: "Handoff",
			title: "Hand over",
			line: "Another team ships it",
		},
	],
	edges: [
		{ id: "start-plan", from: "start", to: "plan" },
		{ id: "plan-build", from: "plan", to: "build" },
		{ id: "build-check", from: "build", to: "check" },
		{ id: "check-build", from: "check", to: "build", label: "red" },
		{ id: "check-gate", from: "check", to: "gate" },
		{ id: "gate-plan", from: "gate", to: "plan", label: "uncertain" },
		{ id: "gate-review", from: "gate", to: "review", label: "green" },
		{
			id: "review-handoff",
			from: "review",
			to: "handoff",
			label: "approve",
			handoff: true,
		},
	],
	groups: [
		{
			id: "loop",
			head: "Until green · repeat 2×",
			holds: ["build", "check"],
		},
	],
};

const LEGS: CanvasNode[] = [
	{
		id: "begin",
		icon: "Play",
		overline: "Page",
		title: "Start",
		line: "Opens the flow",
	},
	{
		id: "a1",
		icon: "FileText",
		overline: "Page",
		title: "Short form",
		line: "One question",
	},
	{
		id: "a2",
		icon: "Mail",
		overline: "Message",
		title: "Reminder",
		line: "After a day",
	},
	{
		id: "b1",
		icon: "FileText",
		overline: "Page",
		title: "Long form",
		line: "Five questions",
	},
	{
		id: "b2",
		icon: "Mail",
		overline: "Message",
		title: "Follow-up",
		line: "After three days",
	},
	{
		id: "c1",
		icon: "Phone",
		overline: "Message",
		title: "Call",
		line: "Booked by hand",
	},
	{
		id: "merge",
		icon: "GitMerge",
		overline: "Page",
		title: "Confirm",
		line: "Where the legs meet",
	},
	{
		id: "finish",
		icon: "Check",
		overline: "Page",
		title: "Done",
		line: "Ends the flow",
	},
];

const BRANCHES: CanvasEdge[] = [
	{ id: "begin-a1", from: "begin", to: "a1", label: "Option 1" },
	{ id: "begin-b1", from: "begin", to: "b1", label: "Option 2" },
	{ id: "begin-c1", from: "begin", to: "c1", label: "Option 3" },
	{ id: "a1-a2", from: "a1", to: "a2" },
	{ id: "b1-b2", from: "b1", to: "b2" },
	{ id: "a2-merge", from: "a2", to: "merge" },
	{ id: "b2-merge", from: "b2", to: "merge" },
	{ id: "c1-merge", from: "c1", to: "merge" },
	{ id: "merge-finish", from: "merge", to: "finish" },
];

// A journey: three legs and a rejoin, its nodes numbered in path order the
// way a consumer numbers them, from the library.
const NUMBERS = new Map(
	pathOrder(LEGS, BRANCHES).map((id, index) => [id, index + 1]),
);
export const JOURNEY: Graph = {
	nodes: LEGS.map((node) => ({ ...node, number: NUMBERS.get(node.id) })),
	edges: BRANCHES,
};

// A loop whose body is empty stands in its place in the path, between two
// nodes, and its edges name it; and one with nothing around it.
export const HOLLOW: Graph = {
	nodes: WORKFLOW.nodes.filter(({ id }) => id === "plan" || id === "handoff"),
	edges: [
		{ id: "plan-loop", from: "plan", to: "loop" },
		{ id: "loop-handoff", from: "loop", to: "handoff" },
	],
	groups: [{ id: "loop", head: "Until green", holds: [] }],
};
export const HOLLOW_ALONE: Graph = {
	nodes: [],
	edges: [],
	groups: HOLLOW.groups,
};
// The consumer placed every node, so no layout runs: the empty groups stand in
// one row below the nodes in path order, the one an edge names first.
export const HOLLOW_PLACED: Graph = {
	nodes: HOLLOW.nodes.map((node, index) => ({
		...node,
		position: { x: 0, y: index * 240 },
	})),
	edges: [
		{ id: "plan-handoff", from: "plan", to: "handoff" },
		{ id: "handoff-loop", from: "handoff", to: "loop" },
	],
	groups: [
		{ id: "retry", head: "Retry", holds: [] },
		{ id: "loop", head: "Until green", holds: [] },
	],
};

// The states a node and an edge draw, each over one of the two graphs: the
// graph's nodes with a mark added to those named. Fixtures hold no position,
// so the canvas places them.
type Marks = Record<string, Partial<CanvasNode>>;

function marked(graph: Graph, marks: Marks, path?: CanvasPath): Graph {
	return {
		...graph,
		nodes: graph.nodes.map((node) => ({ ...node, ...marks[node.id] })),
		...(path && { path }),
	};
}

// An off node: its in-edge dims, and its out-edge, the handoff, dims and
// stays dashed.
export const OFF = marked(WORKFLOW, { review: { off: true } });

// A problem found on save: the first words, in place of the line.
export const PROBLEM = marked(WORKFLOW, {
	build: { problem: "Missing the target" },
});

// One status per node and per state, in node order.
export const STATUSES = marked(WORKFLOW, {
	start: { status: { state: "done", label: "Done" } },
	plan: { status: { state: "waiting", label: "Waiting" } },
	build: { status: { state: "running", label: "Running" } },
	check: { status: { state: "failed", label: "Failed" } },
	gate: { status: { state: "attention", label: "Needs a look" } },
	review: { status: { state: "active", label: "Active" } },
	handoff: { status: { state: "idle", label: "Idle" } },
});

// A run: the loop ran once, the gate answered "green" and the review is under
// way; the gate's answer upstream and the handoff stay off the path.
const DONE = { state: "done", label: "Done" } as const;
export const RUN = marked(
	WORKFLOW,
	{
		start: { status: DONE },
		plan: { status: DONE },
		build: { status: DONE },
		check: { status: DONE },
		gate: { status: DONE },
		review: { status: { state: "running", label: "Running" } },
	},
	{
		nodes: ["start", "plan", "build", "check", "gate", "review"],
		edges: [
			"start-plan",
			"plan-build",
			"build-check",
			"check-build",
			"check-gate",
			"gate-review",
		],
		at: "review",
	},
);

// A scenario that stops where it failed: the rest of the journey dims.
const PASSED = { state: "done", label: "Passed" } as const;
export const SCENARIO = marked(
	JOURNEY,
	{
		begin: { status: PASSED },
		b1: { status: PASSED },
		b2: { status: { state: "failed", label: "Failed" } },
	},
	{ nodes: ["begin", "b1", "b2"], edges: ["begin-b1", "b1-b2"], at: "b2" },
);
