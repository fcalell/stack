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

// Two single-node sections side by side under a brief, each a group whose head
// is longer than its frame: under the text floor a frame is its glyph and its
// padding, a few words wide, and its head takes the frame's whole width, never
// the part a stack's column would leave (the stack stands at the foot, below it).
export const SECTIONS: Graph = {
	nodes: [
		{
			id: "brief",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "A brief",
			line: "Starts the write-up",
		},
		{
			id: "layout",
			icon: "Layers",
			overline: "Section",
			title: "Layout",
			line: "How the parts fit",
		},
		{
			id: "words",
			icon: "BookOpen",
			overline: "Section",
			title: "Words",
			line: "What each part is called",
		},
	],
	edges: [
		{ id: "brief>layout", from: "brief", to: "layout" },
		{ id: "brief>words", from: "brief", to: "words" },
	],
	groups: [
		{ id: "architecture", head: "Architecture", holds: ["layout"] },
		{ id: "glossary", head: "Glossary", holds: ["words"] },
	],
};

// Two loops under a step, one the first part of the other (a deploy's work and
// its fix): under the text floor each head draws at its own size on screen and
// the nodes spread by its growth, so no head covers the step above its loop.
export const LOOPS: Graph = {
	nodes: [
		{
			id: "begin",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "A call, on a unit",
			line: "Starts the run",
		},
		{
			id: "setup",
			icon: "Terminal",
			overline: "Command",
			title: "Setup",
			line: "Runs the setup",
		},
		{
			id: "build",
			icon: "Sparkles",
			overline: "Agent",
			title: "Build",
			line: "Makes the change",
		},
		{
			id: "check",
			icon: "Terminal",
			overline: "Command",
			title: "Check",
			line: "Runs the check",
		},
		{
			id: "review",
			icon: "Hand",
			role: "wait",
			overline: "Gate",
			title: "Ready",
			line: "Approve or Request changes",
		},
		{
			id: "deploy",
			icon: "Flag",
			role: "end",
			overline: "End",
			title: "Deployed",
			line: "Closes the run",
		},
	],
	edges: [
		{ id: "begin-setup", from: "begin", to: "setup" },
		{ id: "setup-build", from: "setup", to: "build" },
		{ id: "build-check", from: "build", to: "check" },
		{ id: "check-build", from: "check", to: "build", label: "red" },
		{ id: "check-review", from: "check", to: "review", label: "green" },
		{
			id: "review-build",
			from: "review",
			to: "build",
			label: "request changes",
		},
		{ id: "review-deploy", from: "review", to: "deploy", label: "approve" },
	],
	groups: [
		{
			id: "work",
			head: "Work · same result 5×, at most 8 attempts",
			holds: ["fix", "review"],
		},
		{
			id: "fix",
			head: "Fix · same result 2×, at most 8 attempts",
			holds: ["build", "check"],
		},
	],
};

// A gate's answers fanned out, each chip on its own arrow: two, and the three
// an edit makes of them, whose words give the gate's line a second line, so the
// gate grows after the layout the edit asks for has run.
const ANSWERING: CanvasNode[] = [
	{
		id: "verdict",
		icon: "Variable",
		overline: "Value",
		title: "Verdict met",
		line: "Sets verdict",
	},
	{
		id: "ready",
		icon: "Hand",
		role: "wait",
		overline: "Gate",
		title: "Ready",
		line: "Approve or Request changes",
	},
	{
		id: "deploy",
		icon: "Wrench",
		overline: "Command",
		title: "Deploy",
		line: "Deploys the build to the target",
	},
	{
		id: "note",
		icon: "Variable",
		overline: "Value",
		title: "Changes note",
		line: "Sets note",
	},
	{
		id: "deployed-as",
		icon: "Variable",
		overline: "Value",
		title: "Deployed as",
		line: "Sets build",
	},
	{
		id: "deployed",
		icon: "Flag",
		role: "end",
		overline: "End",
		title: "Deployed",
		line: "Closes the run",
	},
];
export const ANSWERS_TWO: Graph = {
	nodes: ANSWERING,
	edges: [
		{ id: "verdict>ready", from: "verdict", to: "ready" },
		{
			id: "ready>deploy:approve",
			from: "ready",
			to: "deploy",
			label: "approve",
		},
		{
			id: "ready>note:request changes",
			from: "ready",
			to: "note",
			label: "request changes",
		},
		{ id: "deploy>deployed-as", from: "deploy", to: "deployed-as" },
		{ id: "deployed-as>deployed", from: "deployed-as", to: "deployed" },
		{ id: "note>deployed", from: "note", to: "deployed" },
	],
};
export const ANSWERS_THREE: Graph = {
	nodes: ANSWERING.map((node) =>
		node.id === "ready"
			? { ...node, line: "Approve, Request changes or Revise" }
			: node,
	),
	edges: [
		...ANSWERS_TWO.edges,
		{
			id: "ready>deployed:revise",
			from: "ready",
			to: "deployed",
			label: "revise",
		},
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

// A warning found on save: the first words, in place of the line.
export const WARNING = marked(WORKFLOW, {
	build: { warning: "Missing the target" },
});

// One status per node and per state, in node order.
export const STATUSES = marked(WORKFLOW, {
	start: { status: { tone: "done", label: "Done" } },
	plan: { status: { tone: "waiting", label: "Waiting" } },
	build: { status: { tone: "running", label: "Running" } },
	check: { status: { tone: "failed", label: "Failed" } },
	gate: { status: { tone: "attention", label: "Needs a look" } },
	review: { status: { tone: "active", label: "Active" } },
	handoff: { status: { tone: "idle", label: "Idle" } },
});

// A run: the loop ran once, the gate answered "green" and the review is under
// way; the gate's answer upstream and the handoff stay off the path.
const DONE = { tone: "done", label: "Done" } as const;
export const RUN = marked(
	WORKFLOW,
	{
		start: { status: DONE },
		plan: { status: DONE },
		build: { status: DONE },
		check: { status: DONE },
		gate: { status: DONE },
		review: { status: { tone: "running", label: "Running" } },
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
const PASSED = { tone: "done", label: "Passed" } as const;
export const SCENARIO = marked(
	JOURNEY,
	{
		begin: { status: PASSED },
		b1: { status: PASSED },
		b2: { status: { tone: "failed", label: "Failed" } },
	},
	{ nodes: ["begin", "b1", "b2"], edges: ["begin-b1", "b1-b2"], at: "b2" },
);

// Every role a node can take, in one graph: a start, a step, a decision whose
// answers label its out-edges, a wait on a person, a call that opens
// another graph, and an end. The wait's and the call's status labels stand at
// twelve characters, which the node's width holds whole.
export const ROLES: Graph = {
	nodes: [
		{
			id: "begin",
			icon: "Play",
			role: "start",
			overline: "Trigger",
			title: "Start",
			line: "Every weekday",
		},
		{
			id: "plan",
			icon: "ListChecks",
			role: "step",
			overline: "Plan",
			title: "Draft a plan",
			line: "Writes the steps",
			status: { tone: "running", label: "Running 12" },
		},
		{
			id: "gate",
			icon: "GitBranch",
			role: "decision",
			overline: "Decision",
			title: "Is it green?",
			line: "Pass or ask",
		},
		{
			id: "approve",
			icon: "Hand",
			role: "wait",
			overline: "Wait",
			title: "Awaiting review",
			line: "Asks a person first",
			status: { tone: "attention", label: "Run parked" },
		},
		{
			id: "checks",
			icon: "Workflow",
			role: "call",
			overline: "Call",
			title: "Run the checks",
			line: "Another graph",
			href: "/checks",
		},
		{
			id: "finish",
			icon: "Flag",
			role: "end",
			overline: "End",
			title: "Done",
			line: "Closes the run",
		},
	],
	edges: [
		{ id: "begin-plan", from: "begin", to: "plan" },
		{ id: "plan-gate", from: "plan", to: "gate" },
		{ id: "gate-checks", from: "gate", to: "checks", label: "green" },
		{ id: "gate-approve", from: "gate", to: "approve", label: "uncertain" },
		{ id: "checks-finish", from: "checks", to: "finish" },
		{ id: "approve-finish", from: "approve", to: "finish" },
	],
};

// A graph taller than any pane: a fit holds it at the scale the words draw at
// and frames its start, so the reader pans for the rest.
const STEPS: readonly (readonly [string, CanvasNode["icon"]])[] = [
	["Read the request", "FileText"],
	["Draft a plan", "ListChecks"],
	["Make the change", "Hammer"],
	["Run the checks", "ShieldCheck"],
	["Review the diff", "Eye"],
	["Fix the findings", "Wrench"],
	["Write the notes", "Pencil"],
	["Ask for sign-off", "Hand"],
	["Merge the branch", "GitMerge"],
	["Deploy it", "Rocket"],
];
export const LONG: Graph = {
	nodes: STEPS.map(([title, icon], index) => ({
		id: `step-${index}`,
		icon,
		title,
		role: index === 0 ? "start" : index === STEPS.length - 1 ? "end" : "step",
		overline: `Step ${index + 1}`,
		line: "Does its part",
	})),
	edges: STEPS.slice(1).map((_, index) => ({
		id: `link-${index}`,
		from: `step-${index}`,
		to: `step-${index + 1}`,
	})),
};

// Each role's shape with its marks: a status above and a warning below on a card, a
// circle and a diamond, where the marks seat on the glyph's right edge.
export const ROLES_MARKED = marked(ROLES, {
	begin: { status: { tone: "done", label: "Done" }, warning: "Missing a time" },
	plan: { warning: "Missing the target" },
	gate: {
		status: { tone: "attention", label: "Needs a look" },
		warning: "Missing an answer",
	},
	finish: { status: { tone: "idle", label: "Idle" } },
});

// Each role drawn quiet: the shape stays and the tone steps back.
export const ROLES_OFF = marked(ROLES, {
	begin: { off: true },
	plan: { off: true },
	gate: { off: true },
	approve: { off: true },
	checks: { off: true },
	finish: { off: true },
});

// A run that stopped at the call: the wait and the end stay off the path.
export const ROLES_RUN = marked(
	ROLES,
	{},
	{
		nodes: ["begin", "plan", "gate", "checks"],
		edges: ["begin-plan", "plan-gate", "gate-checks"],
		at: "checks",
	},
);

// A journey whose first leg's edge carries a label the width of a sentence,
// which its chip draws whole.
export const OPENING: Graph = {
	...JOURNEY,
	edges: JOURNEY.edges.map((edge) =>
		edge.id === "begin-a1"
			? { ...edge, label: "Open the ticked as units" }
			: edge,
	),
};

// Nodes whose titles and statuses compete for a node's width: the status is a
// badge that keeps its word up to the short measure and cuts it inside its box
// past it, the title truncates, and the line under the badge is plain text that
// wraps to a second line and is cut at that one's end.
export const CROWDED: Graph = {
	nodes: [
		{
			id: "short",
			icon: "Workflow",
			role: "start",
			overline: "Trigger",
			title: "A call, on a unit",
			line: "Starts the run",
			status: { tone: "running", label: "Running 6" },
		},
		{
			id: "long",
			icon: "ListChecks",
			role: "step",
			overline: "Plan",
			title: "A call, on a unit",
			line: "Called by Hotfix, Release, Patch, Feature and every hand-off that waits on its steps",
			status: {
				tone: "running",
				label: "Running 6 of 12 checks in the nightly queue",
			},
		},
	],
	edges: [{ id: "short-long", from: "short", to: "long" }],
};

// A small workflow that asks first and has two ways out: a trigger, a gate and
// an exit for each answer. Its two exits stand side by side, two cards and a gap
// across (about 500 px), wider than a phone's pane and than a half-width pane's,
// so it opens as the overview where its cards cannot stand at the text floor,
// every glyph whole and clear of the zoom stack; from a pane about that wide and
// a pair over, it opens at its words.
export const WELCOME_NOTE: Graph = {
	nodes: [
		{
			id: "call",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "A call",
			line: "A note to welcome Maya",
		},
		{
			id: "say-ok",
			icon: "GitFork",
			role: "decision",
			overline: "Gate",
			title: "Say ok",
			line: "Shows the note first",
		},
		{ id: "no", icon: "Flag", role: "end", title: "Stop" },
		{ id: "told", icon: "Send", role: "end", title: "Told" },
	],
	edges: [
		{ id: "call>say-ok", from: "call", to: "say-ok" },
		{ id: "say-ok>no", from: "say-ok", to: "no", label: "Not this" },
		{ id: "say-ok>told", from: "say-ok", to: "told", label: "Go on" },
	],
};

// A wide entry graph: a chain that ends in a fan-out of hand-offs side by side,
// a long edge label on the chain, an answer that runs back up the side and a
// loop band whose label carries an attempt count. The cards together are wider
// than a phone's pane and than a half-width pane's, so it opens fitted (as the
// overview where its cards cannot stand at the text floor), with its labels,
// its answer's arrow and its fan-out in view.
export const ENTRY: Graph = {
	nodes: [
		{
			id: "ask",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "An ask",
			line: "Every request runs it",
			status: { tone: "waiting", label: "Waiting" },
		},
		{
			id: "pick",
			icon: "Sparkles",
			overline: "Intake",
			title: "Pick",
			line: "Chooses the service",
			off: true,
		},
		{
			id: "route",
			icon: "GitFork",
			role: "decision",
			overline: "Route",
			title: "Route",
			line: "The router decides every hand-off",
		},
		{ id: "intake", icon: "Sparkles", overline: "Agent", title: "Intake" },
		{
			id: "handed",
			icon: "GitFork",
			role: "decision",
			overline: "Route",
			title: "Handed",
			line: "Who takes it",
		},
		{ id: "web", icon: "Globe", overline: "Hand-off", title: "Hand to web" },
		{
			id: "mobile",
			icon: "Smartphone",
			overline: "Hand-off",
			title: "Hand to mobile",
		},
		{
			id: "billing",
			icon: "Receipt",
			overline: "Hand-off",
			title: "Hand to billing",
		},
	],
	edges: [
		{ id: "ask-pick", from: "ask", to: "pick" },
		{ id: "pick-route", from: "pick", to: "route" },
		{
			id: "route-intake",
			from: "route",
			to: "intake",
			label: "intake · web · mobile · billing",
		},
		{ id: "intake-handed", from: "intake", to: "handed" },
		{ id: "handed-web", from: "handed", to: "web", handoff: true },
		{ id: "handed-mobile", from: "handed", to: "mobile", handoff: true },
		{ id: "handed-billing", from: "handed", to: "billing", handoff: true },
		{ id: "web-intake", from: "web", to: "intake", label: "answer" },
	],
	groups: [
		{
			id: "attempts",
			head: "Until it holds · same result 5×, at most 12 attempts",
			holds: ["intake", "handed", "web"],
		},
	],
};

// The entry graph as a run left it at the route: the pick is off and on the
// path, the rest is off it, so the three reads stand in one canvas: on the path
// (a filled card, the body ink), off (a filled card, the meta ink, the word
// "Off") and off the path (a hairline, the meta ink at regular weight, its
// edges and their chips dimmed).
export const ENTRY_RUN: Graph = {
	...ENTRY,
	path: {
		nodes: ["ask", "pick", "route"],
		edges: ["ask-pick", "pick-route"],
		at: "route",
	},
};
