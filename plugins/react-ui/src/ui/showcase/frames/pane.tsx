import type { Datum, Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Option, RecordFact, Run } from "@fcalell/ui-core/descriptors";
import { BREAKPOINT_PX, type Tone } from "@fcalell/ui-core/tokens";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Canvas } from "../../components/canvas/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import { Text } from "../../components/text/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { WORKFLOW } from "../graphs.ts";
import {
	type HeldState,
	isHeld,
	type Reads,
	readsAt,
	waiting,
	waitingText,
} from "../waiting.ts";
import { StandInList, StandInRows } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";
import { ACTIONS, Column, MORE, Opened } from "./place.tsx";
import { SERVER } from "./section-rows.ts";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};
const _SEARCH = [{ icon: "Search" as const, label: "Search", onAct: act }];

// A Pane that fills (a Canvas, a Thread) needs a Place with a height of its
// own: the page's, in the shell, is the viewport's.
function Tall(props: { children: ReactNode }) {
	return <div className="flex flex-col h-[40rem]">{props.children}</div>;
}

function Issues() {
	return (
		<Pane>
			<Section title="Open">
				<StandInList />
			</Section>
			<Section title="In review">
				<StandInList />
			</Section>
			<Section title="Done">
				<StandInList />
			</Section>
		</Pane>
	);
}

function Record() {
	return (
		<Pane title="Fix invoice rounding" record={{}}>
			<Section title="Activity">
				<StandInRows />
			</Section>
		</Pane>
	);
}

// Each frame's Place names the page with its one `h1`, drawn apart from sight
// (the Shell does it from the current place), and the place's Pane draws that
// name; a record's Pane draws its own after it. A Pane is the same `h2`
// whether it stands alone or beside the other, and its Sections start at `h3`.
// One Pane: the page, its acts and more on the bar.
function One() {
	return (
		<Place title="Deploys">
			<Pane acts={ACTIONS} more={MORE}>
				<StandInList />
			</Pane>
		</Place>
	);
}

const LONG_CONTEXT =
	"Preview of release 14 billing, invoicing and tax reporting changes";

// One Pane whose bar holds a title, the context pick and two acts: the title
// keeps its two fifths of the row, and the pick's label truncates before it;
// below a Pane width of `tablet` the pick is its dot and chevron. Every form
// judges its own edge, the `long` one with a label that would take the row.
function Context(props: { preview?: boolean; long?: boolean }) {
	const [value, setValue] = useState<string | null>(
		props.preview || props.long ? "preview" : "production",
	);
	const box = useRef<HTMLDivElement>(null);
	// The frame judges its own edge in each form: the title keeps two fifths of
	// the bar, the title, the pick and each act stand clear of one another, a
	// pick in a Pane narrower than `tablet` draws no label text and is named by
	// its label, and nothing is clipped without an ellipsis.
	const form = props.long ? "long" : props.preview ? "preview" : "production";
	useEffect(() => {
		let frame = 0;
		let seen = 0;
		const read = () => {
			const bar = box.current?.querySelector("header > div");
			const title = bar?.querySelector("p, h2");
			const trigger = bar?.querySelector("span > button[aria-haspopup]");
			const acts = bar?.lastElementChild;
			if (!bar || !title || !trigger || !acts || ++seen < SHIFT_SETTLE) {
				if (seen < SHIFT_WAIT) frame = requestAnimationFrame(read);
				return;
			}
			const held = title.getBoundingClientRect().width;
			const row = bar.getBoundingClientRect().width;
			if (held < (row * 2) / 5 - 1)
				console.error(
					`the bar's title is squeezed to ${Math.round(held)} px of a ${Math.round(row)} px row by the context pick (${form} context)`,
				);
			const chip = trigger.querySelector("span:has(> span)");
			const parts: [string, Element][] = [
				["title", title],
				["context pick", trigger],
				...[...acts.children].map((one, at): [string, Element] => [
					`act ${at + 1}`,
					one,
				]),
			];
			const meet = (x: DOMRect, y: DOMRect) =>
				x.left < y.right - 0.5 &&
				y.left < x.right - 0.5 &&
				x.top < y.bottom - 0.5 &&
				y.top < x.bottom - 0.5;
			for (const [at, [one, left]] of parts.entries())
				for (const [two, right] of parts.slice(at + 1))
					if (meet(left.getBoundingClientRect(), right.getBoundingClientRect()))
						console.error(
							`the bar's ${one} overlaps its ${two} (${form} context, ${Math.round(row)} px row)`,
						);
			// The collapsed pick renders only what it shows: no part of the pick clips
			// content (an ellipsis is the label's own cut), and its name starts with
			// its visible text (WCAG 2.5.3).
			for (const one of [trigger, ...trigger.querySelectorAll("*")]) {
				const style = getComputedStyle(one);
				if (
					(style.overflowX === "hidden" || style.overflowX === "clip") &&
					style.textOverflow !== "ellipsis" &&
					one.scrollWidth > one.clientWidth + 1
				)
					console.error(
						`the context pick clips content in its ${one === trigger ? "trigger" : one.tagName.toLowerCase()} (${form} context, ${Math.round(row)} px row)`,
					);
			}
			const pane = bar.closest("[data-page]")?.getBoundingClientRect().width;
			if (pane !== undefined && pane < BREAKPOINT_PX.tablet) {
				const shown = ((trigger as HTMLElement).innerText ?? "").trim();
				if (shown !== "")
					console.error(
						`the context pick draws "${shown}" in a Pane of ${Math.round(pane)} px, below tablet (${form} context)`,
					);
				const named = trigger.getAttribute("aria-label") ?? "";
				const chosen = props.long
					? LONG_CONTEXT
					: form === "production"
						? "Production"
						: "Release 14 preview";
				if (!named.startsWith(chosen))
					console.error(
						`the context pick's name "${named}" is not its label "${chosen}" (${form} context, ${Math.round(pane)} px Pane)`,
					);
			}
			const frameBox = trigger.getBoundingClientRect();
			for (const [name, part] of [
				["chip", chip],
				...[...trigger.querySelectorAll("svg, [data-tone]")].map(
					(one): [string, Element] => ["mark", one],
				),
			] as [string, Element | null][]) {
				if (!part) continue;
				const at = part.getBoundingClientRect();
				if (
					at.width > 0 &&
					(at.left < frameBox.left - 0.5 || at.right > frameBox.right + 0.5)
				)
					console.error(
						`the context pick's ${name} spills past its frame (${form} context, ${Math.round(row)} px row)`,
					);
				for (const [two, act] of parts.slice(2))
					if (meet(at, act.getBoundingClientRect()))
						console.error(
							`the context pick's ${name} overlaps the bar's ${two} (${form} context, ${Math.round(row)} px row)`,
						);
			}
		};
		frame = requestAnimationFrame(read);
		return () => cancelAnimationFrame(frame);
	}, [form, props.long]);
	return (
		<div ref={box}>
			<Place title="Core data layer">
				<Pane
					acts={ACTIONS}
					more={MORE}
					context={{
						label: "Context",
						value,
						onChange: setValue,
						options: [
							{ value: "production", label: "Production" },
							{
								value: "preview",
								label: props.long ? LONG_CONTEXT : "Release 14 preview",
								chip: { family: "amber", label: "Preview" },
							},
						],
					}}
					state={props.preview || props.long ? "attention" : "active"}
				>
					<StandInList />
				</Pane>
			</Place>
		</div>
	);
}

// Two: the place's Pane and the record it opened, whose bar act is Close beside
// the place's Pane and Back where the record stands alone (below `tablet` of the
// Place).
function Two() {
	return (
		<Place title="Issues">
			<Issues />
			<Record />
		</Place>
	);
}

// Two, the record a list of facts whose copyable values are long code: beside
// the list the record's Pane is a card narrower than the value, so each value
// stands whole on the lines it takes, at its separators, up to the copy act.
function Facted() {
	return (
		<Place title="Issues">
			<Issues />
			<Pane title="Ledger server" record={{}}>
				<Section title="Server" items={SERVER} />
			</Pane>
		</Place>
	);
}

// A page short enough that a failure or an empty state centres in what the
// body leaves.
function Short(props: { place: string; children: ReactNode }) {
	return (
		<div className="flex flex-col h-[24rem]">
			<Place title={props.place}>{props.children}</Place>
		</div>
	);
}

// A Pane over a read still to answer: its acts and more paint, inert,
// the body's leaves paint where they stand, and the docked foot is inert.
function Waiting({ reads }: { reads: Reads }) {
	const { waiting } = reads;
	const [value, setValue] = useState("");
	return (
		<Short place="Deploys">
			<Pane
				read={waiting}
				acts={ACTIONS.map((one) => waiting.at(() => one))}
				more={waiting.at(() => MORE)}
				foot={
					<MessageInput
						value={value}
						onChange={setValue}
						placeholder="Ask about your deploys"
						onSend={act}
					/>
				}
			>
				<Section title="Recent">
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A Pane over a read that holds rows: busy draws the mark after the title,
// stale and paused the line under the bar; the body is the loaded tree.
function Held({ reads, state }: { reads: Reads; state: HeldState }) {
	return (
		<Short place="Deploys">
			<Pane read={reads[state]} acts={ACTIONS} more={MORE}>
				<Section title="Recent">
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A read that fails fills the page with its sentence and Retry, and one that
// answers not found with the missing form and a way back: the generic sentence,
// and the one a `noun` words or a `missing` says. A record titled by its failed read keeps its
// place in the bar, and its failed form is the page's heading.
function Failed({ reads }: { reads: Reads }) {
	const { failing, missing } = reads;
	return (
		<>
			<Column>
				<Short place="Deploys">
					<Pane read={failing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short place="Deploys">
					<Pane title="dpl_7Hp9aK" record={{}} read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short place="Deploys">
					<Pane title="dpl_7Hp9aK" record={{}} noun="deploy" read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short place="Reports">
					<Pane
						title={missing.at(() => NAME)}
						record={{}}
						noun="report"
						missing="No report for that month."
						read={missing}
					/>
				</Short>
			</Column>
			<Column>
				<Short place={WITHIN}>
					<Pane title={failing.at(() => NAME)} read={failing} record={{}} />
				</Short>
			</Column>
			{/* A record that answers not found beside its list: its bar names the kind, the missing form's Back its one way out. */}
			<Column>
				<Short place="Deploys">
					<Place title="Deploys">
						<Issues />
						<Pane
							title={missing.at(() => NAME)}
							record={{}}
							noun="deploy"
							read={missing}
						/>
					</Place>
				</Short>
			</Column>
			<Column>
				<Short place="Deploys">
					<Place title="Deploys">
						<Issues />
						<Pane title={missing.at(() => NAME)} record={{}} read={missing} />
					</Place>
				</Short>
			</Column>
		</>
	);
}

// The cells a record's head draws, and the cells the missing form draws beyond
// the Pane's own.
const HEAD_CELLS =
	/^(BLOCK_IN|ITEM_|WORD_ACT|STATUS|SPINNER|COUNT|ICON\.fit\.(meta|body)|IMAGE|PAINT\.)/;
const MISSING_CELLS = /^(CARD_PART|BUTTON)/;

const move = () => {};

// The states the record moves between, each drawn as its status.
const STATES: Option<Tone>[] = [
	{ value: "waiting", label: "Todo", leading: { tone: "waiting" } },
	{ value: "active", label: "In progress", leading: { tone: "active" } },
	{ value: "attention", label: "Blocked", leading: { tone: "attention" } },
	{ value: "done", label: "Done", leading: { tone: "done" } },
	{ value: "failed", label: "Failed", leading: { tone: "failed" } },
];

const NAME = "Re-run the nightly import";
const WITHIN = "Work · Imports";
const OVERLINE = ["Infra", "ACM-137", "Cycle 14"];
const REST = [{ count: 12, label: "Comments" }, "Ana Ruiz", "Due Oct 4"];

// A head whose reads never answer: its parts and facts stay painted, a status
// and a pick keeping their forms.
const WAITING_OVERLINE: readonly Selection<Run>[] = [waitingText, waitingText];
const WAITING_FACTS: readonly Selection<RecordFact>[] = [
	waiting.at((): RecordFact => ({ tone: "done" })),
	waiting.at(
		(): RecordFact => ({
			pick: { label: "Status", options: STATES, onChange: move },
		}),
	),
	waitingText,
	waitingText,
];

function moving(state: Tone) {
	return {
		pick: { label: "Status", options: STATES, value: state, onChange: move },
	};
}

// The record's picture: loaded, one that fails to load, an empty address and one
// still to land.
const PICTURE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#8896a8"/><circle cx="4" cy="4" r="2" fill="#dde3ea"/></svg>')}`;
const PICTURES: readonly (Selection<string> | string)[] = [
	PICTURE,
	"/missing.png",
	"",
	waitingText,
];

// A record's Pane: the place in the bar, the name and the facts at the body's
// top.
function Head(props: { facts: readonly RecordFact[]; image?: Datum<string> }) {
	return (
		<Column>
			<Short place={WITHIN}>
				<Pane
					title={NAME}
					record={{
						overline: OVERLINE,
						facts: props.facts,
						image:
							props.image === undefined
								? undefined
								: { src: props.image, alt: "The import's run" },
					}}
				/>
			</Short>
		</Column>
	);
}

// The same Pane over parts that never answer.
function HeadWaiting() {
	return (
		<Column>
			<Short place={WITHIN}>
				<Pane
					title={waitingText}
					record={{
						overline: WAITING_OVERLINE,
						facts: WAITING_FACTS,
					}}
				/>
			</Short>
		</Column>
	);
}

// The head a record draws while it waits and loaded, the body under it the
// same: three facts painted (the pick, the status, the age), and loaded two,
// the pick a wide one and the status none, beside the outside-content mark,
// which is the record's own and stands in both forms. The mark stands at the
// end of the name's line and takes no row of the facts, so a head whose loaded
// facts are fewer or narrower than painted gains none from it: the third head
// is the loaded one without the mark, and the frame reads the Section heading
// of each loaded head and logs an error when the mark moved it.
const SHIFT_WAITING: readonly Selection<RecordFact>[] = [
	waiting.at(
		(): RecordFact => ({
			pick: { label: "Status", options: STATES, onChange: move },
		}),
	),
	waiting.at((): RecordFact => ({ tone: "done" })),
	waitingText,
];
const SHIFT_LOADED: readonly RecordFact[] = [moving("attention"), "2 min"];

function ShiftHead(props: { form: "waiting" | "loaded" | "bare" }) {
	const loaded = props.form !== "waiting";
	return (
		<Column>
			<Short place="Home">
				<Pane
					title={loaded ? "Heating" : waitingText}
					record={{
						overline: loaded ? ["Billing", "Invoices"] : WAITING_OVERLINE,
						facts: [
							...(loaded ? SHIFT_LOADED : SHIFT_WAITING),
							...(props.form === "bare" ? [] : [EDGE_OUTSIDE]),
						],
					}}
				>
					<Section title="Today">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</Column>
	);
}

// How many frames the check waits for the Panes to stand, and then for the
// layout to settle.
const SHIFT_WAIT = 120;
const SHIFT_SETTLE = 4;

function HeadShift() {
	const heads = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let waited = 0;
		let seen = 0;
		// A Section heading's top in its Pane's column.
		const top = (column: Element | undefined) =>
			column
				? (column.querySelector("h3")?.getBoundingClientRect().top ??
						Number.NaN) - column.getBoundingClientRect().top
				: Number.NaN;
		const read = () => {
			const columns = heads.current?.children;
			if (!columns || columns.length < 3 || !columns[2]?.querySelector("h3")) {
				if (++waited < SHIFT_WAIT) frame = requestAnimationFrame(read);
				return;
			}
			if (++seen < SHIFT_SETTLE) {
				frame = requestAnimationFrame(read);
				return;
			}
			const [mark, bare] = [top(columns[1]), top(columns[2])];
			if (Math.round(mark) !== Math.round(bare))
				console.error(
					`the outside-content mark moves the body from ${bare} to ${mark}`,
				);
		};
		frame = requestAnimationFrame(read);
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<div ref={heads} className="flex flex-row flex-wrap gap-pair min-w-0">
			<ShiftHead form="waiting" />
			<ShiftHead form="loaded" />
			<ShiftHead form="bare" />
		</div>
	);
}

// A head whose waiting facts cannot say their kinds (a view drawn from a
// manifest paints each fact as one word) stands where the loaded head does,
// whatever kinds land: a pick, a fact that opens and one that goes to a route
// (each a control with the target's hit box, pulled back to the badge's line),
// or badges alone. The three heads hold the same body under them, and the
// frame logs an error when the Section heading of the loaded ones does not stand
// where the waiting one's does.
const KINDS_LOADED: Record<"acting" | "plain", readonly RecordFact[]> = {
	acting: [
		moving("done"),
		{ label: "Details", onOpen: move },
		{ label: "Run", href: "/runs/42" },
	],
	plain: [{ tone: "done" }, "Ana", "2 min"],
};

function KindsHead(props: { form: "waiting" | "acting" | "plain" }) {
	const loaded = props.form !== "waiting";
	return (
		<Column>
			<Short place="Home">
				<Pane
					title={loaded ? "Heating" : waitingText}
					record={{
						overline: loaded ? ["Billing", "Invoices"] : WAITING_OVERLINE,
						facts:
							props.form === "waiting"
								? [waitingText, waitingText, waitingText]
								: KINDS_LOADED[props.form],
					}}
				>
					<Section title="Today">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</Column>
	);
}

function HeadKinds() {
	const heads = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let waited = 0;
		let seen = 0;
		const top = (column: Element | undefined) =>
			column
				? (column.querySelector("h3")?.getBoundingClientRect().top ??
						Number.NaN) - column.getBoundingClientRect().top
				: Number.NaN;
		const read = () => {
			const columns = [...(heads.current?.children ?? [])];
			if (
				columns.length < 3 ||
				!columns.every((one) => one.querySelector("h3"))
			) {
				if (++waited < SHIFT_WAIT) frame = requestAnimationFrame(read);
				return;
			}
			if (++seen < SHIFT_SETTLE) {
				frame = requestAnimationFrame(read);
				return;
			}
			const [waits, acting, plain] = columns.map((one) => Math.round(top(one)));
			if (waits !== acting || waits !== plain)
				console.error(
					`a head's facts move the body: ${waits} waiting, ${acting} with a pick and links, ${plain} with badges alone`,
				);
		};
		frame = requestAnimationFrame(read);
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<div ref={heads} className="flex flex-row flex-wrap gap-pair min-w-0">
			<KindsHead form="waiting" />
			<KindsHead form="acting" />
			<KindsHead form="plain" />
		</div>
	);
}

// A head at its edges: a place as long as a sentence, so at 320 the overline
// stands on one line, cut at its end, and the outside-content
// mark as its glyph at the end of the name's first line, no line of the facts;
// then a branch
// among the facts and a command line in the description, each code run
// wrapping whole at its separators where the head is narrow, never cut with an
// ellipsis.
const EDGE_WITHIN = "Work · Platform engineering and infrastructure";
const EDGE_OVERLINE = ["Ready to deploy", "Web", "acme-web", "2 min"];
// An address as long as the line: the overline stays one line, cut at its end,
// never broken after its `@` or its dots.
const EDGE_ADDRESS = [
	"Support",
	'"Example Enterprise Accounts Payable Notifications" <billing-notifications@accounts.example-enterprise.com>',
	"6 min",
];
const EDGE_OUTSIDE: RecordFact = {
	flag: "Globe",
	label: "Outside content",
	words: false,
};
const EDGE_BRANCH: RecordFact = {
	code: "acme-web/deploy-8f3a2c71/refreshTokenRotationScheduleHandler",
};
const EDGE_ABOUT = [
	"The command line ",
	{ code: "npx ledger-mcp --stdio --upload https://paste.example/ledger/v2" },
	" differs from the one you approved.",
];

function HeadEdges() {
	const edge = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let waited = 0;
		const read = () => {
			const line = edge.current?.querySelector("p");
			if (!line) {
				if (++waited < SHIFT_WAIT) frame = requestAnimationFrame(read);
				return;
			}
			const meta = Number.parseFloat(getComputedStyle(line).lineHeight);
			if (line.getBoundingClientRect().height > meta * 1.5)
				console.error("the overline stands on more than one line");
		};
		frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(read);
		});
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<>
			<Column>
				<Short place={WITHIN}>
					<div ref={edge} className="contents">
						<Pane
							title="Ticket 4821"
							record={{
								overline: EDGE_ADDRESS,
								facts: [{ tone: "waiting", label: "Waiting" }],
							}}
						/>
					</div>
				</Short>
			</Column>
			<Column>
				<Short place={EDGE_WITHIN}>
					<Pane
						title="Land the cover cache change"
						record={{
							overline: EDGE_OVERLINE,
							facts: [{ tone: "waiting", label: "Waiting" }, EDGE_OUTSIDE],
						}}
					/>
				</Short>
			</Column>
			<Column>
				<Short place={WITHIN}>
					<Pane
						title="Run the nightly import"
						record={{
							overline: OVERLINE,
							facts: [{ tone: "active", label: "Running" }, EDGE_BRANCH],
							description: EDGE_ABOUT,
						}}
					/>
				</Short>
			</Column>
			{/* Every kind of fact the head draws as a badge, beside the pick that acts: a status with its mark, a link, a count, a warning, a chip, a wordless mark at the end of the name's line, a fact longer than the line cut inside its badge. */}
			<Column>
				<Short place={WITHIN}>
					<Pane
						title="Trim the cover cache"
						record={{
							overline: OVERLINE,
							facts: [
								{ tone: "running", label: "Running" },
								{ label: "Open the run", href: "/runs/42" },
								{ count: 12, label: "Comments" },
								{ warning: "Tests failed twice" },
								{ family: "green", label: "Free" },
								moving("active"),
								EDGE_OUTSIDE,
								"Held by the nightly import until the warehouse migration has finished its last table, which is long",
							],
						}}
					/>
				</Short>
			</Column>
		</>
	);
}

// A record page: the record's name and acts in the Pane's bar, its head under
// it, its act and the sections after them, a sections step apart.
function RecordPage() {
	return (
		<Column>
			<Short place={WITHIN}>
				<Pane
					title={NAME}
					acts={[{ icon: "Pencil", label: "Edit", onAct: move }]}
					record={{
						overline: OVERLINE,
						facts: [moving("active"), ...REST],
						// A machine name inside the sentence, boxed in the mono.
						description: [
							"Reads each table from ",
							{ code: "s3://acme-exports/2026" },
							" and lands it in the warehouse.",
						],
					}}
				>
					<ActionBar acts={[{ label: "Pause the import", onAct: move }]} />
					<Section title="Stages">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</Column>
	);
}

// Every head cell draws the head in the frame's state: at rest the lines a pair
// apart, the first fact a status that moves; loading the head painted, each
// part and fact a selection still to land, and a paint cell the loaded head
// beside the painted one. A `STATUS_DOT.tone` cell stands on that state. A
// third head carries a fact in words that opens beside one that goes to a
// route, the outlined pills that act, and a status that brings no word of its
// own, a state pill all the same, before the plain facts on their grey.
function Heads(frame: ShowcaseFrame) {
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.tone` cell is a state key.
	const state = family === "STATUS_DOT" ? (value as Tone) : "active";
	if (frame.state === "loading") return <HeadWaiting />;
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<>
				<Head facts={[moving("active"), ...REST]} />
				<HeadWaiting />
				<HeadShift />
				<HeadKinds />
			</>
		) : undefined;
	return (
		<Opened popup="closed">
			<Head facts={[moving("attention"), ...REST]} />
			<Head facts={[moving(state), ...REST]} />
			<Head
				facts={[
					{ label: "Outside content", onOpen: move },
					{ label: "Open the run", href: "/runs/42" },
					{ tone: "done" },
					...REST,
				]}
			/>
			<RecordPage />
			<HeadEdges />
			{PICTURES.map((src) => (
				<Head
					key={typeof src === "string" ? src.slice(0, 12) : "waiting"}
					facts={[moving("active"), ...REST]}
					image={src}
				/>
			))}
		</Opened>
	);
}

// A record long enough to scroll, in a body of its own: on touch the bar's name
// waits until the head's has scrolled up under the bar. `scrolled` scrolls the
// body once its head's name is just under the bar, so the pair draws the bar
// before and after; the bar's name keeps its box in both, only its ink moves.
function Scrolling(props: { scrolled: boolean }) {
	const frame = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!props.scrolled) return;
		// The body is the Pane's one box that scrolls; the head's name sits in it.
		const body = [...(frame.current?.querySelectorAll("div") ?? [])].find(
			(one) => one.scrollHeight > one.clientHeight,
		);
		const name = body?.querySelector("h1, h2");
		if (!body || !name) return;
		body.scrollTop +=
			name.getBoundingClientRect().bottom - body.getBoundingClientRect().top;
	}, [props.scrolled]);
	return (
		<div ref={frame} className="contents">
			<Short place={WITHIN}>
				<Pane
					title={NAME}
					record={{
						overline: OVERLINE,
						facts: [moving("active"), ...REST],
					}}
				>
					<Section title="Stages">
						<StandInRows />
					</Section>
					<Section title="Runs">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</div>
	);
}

// A Pane over a read that landed: its title from the data, its body a Section
// holding a selection of the same read, whose count is the rows'.
function Ready({ reads }: { reads: Reads }) {
	const { ready } = reads;
	return (
		<Short place="Deploys">
			<Pane read={ready} acts={ACTIONS} more={MORE}>
				<Section title="Recent" read={ready.at((rows) => rows)}>
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A Pane holding a Canvas: it fills the Pane, whose content is not held to the
// reading width.
function Wide() {
	return (
		<Tall>
			<Place title="Workflow">
				<Pane fill>
					<Canvas
						label="Steps"
						nodes={WORKFLOW.nodes}
						edges={WORKFLOW.edges}
						groups={WORKFLOW.groups}
					/>
				</Pane>
			</Place>
		</Tall>
	);
}

// A Pane holding a Thread: the Thread fills the Pane, its log scrolling, its
// own foot a sections gap under the log.
function Conversation() {
	const [value, setValue] = useState("");
	return (
		<Tall>
			<Place title="Chats">
				<Pane>
					<StandInList />
				</Pane>
				<Pane fill title="Why did the last deploy of api fail?" record={{}}>
					<Thread
						items={TURNS}
						message={TURN}
						composer={{
							value,
							onChange: setValue,
							placeholder: "Reply",
							onSend: () => setValue(""),
						}}
					/>
				</Pane>
			</Place>
		</Tall>
	);
}

const NEW_PROJECT = { label: "New project", onAct: act };
const PROJECTS = "A project holds the deploys, domains and logs of one app.";

// A page as tall as the viewport, so an empty Pane's state alone in its body
// centres in what the body leaves.
function Empty(props: { read: Reads["empty"] }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place title="Projects">
				<Pane
					read={props.read}
					empty={{ sentence: PROJECTS, act: NEW_PROJECT }}
				/>
			</Place>
		</div>
	);
}

// A frame that logs an error where a heading stands empty: a heading with no
// words (and no name of its own) is one for a screen reader to land on and read
// nothing, so a name that landed empty draws none.
const SETTLE = 30;
function NoEmptyHeading(props: { children: ReactNode }) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let seen = 0;
		const watch = () => {
			if (++seen < SETTLE) {
				frame = requestAnimationFrame(watch);
				return;
			}
			for (const heading of host.current?.querySelectorAll(
				"h1, h2, h3, h4, h5, h6",
			) ?? [])
				if (
					(heading.textContent ?? "").trim() === "" &&
					!heading.getAttribute("aria-label")
				)
					console.error("an empty heading stands in the page");
		};
		frame = requestAnimationFrame(watch);
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<div ref={host} className="min-w-0">
			{props.children}
		</div>
	);
}

// A read that answers nothing: the page says so with the Pane's own sentence
// and act, or with the generic sentence. A record's Pane over a read that
// answers nothing keeps its head, the name whole and wrapping at 320 (a long
// hyphenated one), the empty form under it; a name that landed empty draws no
// heading, the bar keeping the place and the empty form saying what the page is.
function Emptied(props: {
	first: Reads;
	second: Reads;
	third: Reads;
	fourth: Reads;
}) {
	return (
		<>
			<Column>
				<Empty read={props.first.empty} />
			</Column>
			<Column>
				<Short place="Deploys">
					<Pane read={props.second.empty} />
				</Short>
			</Column>
			<Column>
				<Short place="Settings">
					<Pane
						title="a-repository-with-a-name-longer-than-the-bar"
						record={{}}
						read={props.third.empty}
						empty={{ sentence: "This repo has no pages yet." }}
					/>
				</Short>
			</Column>
			<Column>
				<NoEmptyHeading>
					<Short place="Settings">
						<Pane
							title=""
							record={{}}
							read={props.fourth.empty}
							empty={{ sentence: "This mapping has nothing in it yet." }}
						/>
					</Short>
				</NoEmptyHeading>
			</Column>
		</>
	);
}

// A Pane whose foot is the ask field, and the same Pane with a task docked in
// its place.
function Tasked() {
	const [value, setValue] = useState("");
	return (
		<Place title="Assistant">
			<Pane
				foot={<MessageInput value={value} onChange={setValue} onSend={act} />}
				sheet={{
					open: true,
					onClose: act,
					title: "Question 1 of 1",
					submit: { label: "Send", onAct: act },
					children: <Text>Who hears about it?</Text>,
				}}
			/>
		</Place>
	);
}

// The cell picks the form; the loading state draws a Pane over a read that
// waits, the error state one over a read that fails and one over a read that
// answers not found, and the empty state draws a Pane over a read that answers
// nothing, with its own sentence and act and with the generic one. The busy,
// stale and paused states draw a Pane over a read that holds rows, on the title
// cell. A head cell draws a record's Pane and a missing-form cell the page of
// a read that answers not found. The title cell draws the Pane's forms in a Place:
// one, two (the place's Pane, then a record's), one holding a Canvas and one
// holding a Thread. The bar icon act draws one Pane
// with its more menu open; the body icon act (the touch top bar's) an
// assistant's home under its search act, its ask field docked at its `foot`,
// since the foot draws no matrix cell of its own, and a record's Pane before and
// after its head's name has scrolled up under the bar.
export function drawPane(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const reads = readsAt(frame.id);
	if (
		HEAD_CELLS.test(cell) &&
		(frame.state === "loading" || frame.state === "rest")
	)
		return Heads(frame);
	if (frame.state === "rest" && MISSING_CELLS.test(cell))
		return <Failed reads={reads} />;
	if (frame.state === "loading")
		return (
			<Column>
				<Waiting reads={reads} />
			</Column>
		);
	if (isHeld(frame.state))
		return cell === "TEXT.role.title" ? (
			<Column>
				<Held reads={reads} state={frame.state} />
			</Column>
		) : undefined;
	if (frame.state === "error") return <Failed reads={reads} />;
	if (frame.state === "empty")
		return (
			<Emptied
				first={reads}
				second={readsAt(`${frame.id}/2`)}
				third={readsAt(`${frame.id}/3`)}
				fourth={readsAt(`${frame.id}/4`)}
			/>
		);
	if (cell === "TEXT.role.title")
		return (
			<>
				<Column>
					<One />
				</Column>
				<Column>
					<Context />
				</Column>
				<Column>
					<Context preview />
				</Column>
				<Column>
					<Context long />
				</Column>
				<Column>
					<Ready reads={reads} />
				</Column>
				<Column>
					<Two />
				</Column>
				<Column>
					<Facted />
				</Column>

				<Column>
					<Wide />
				</Column>
				<Column>
					<Conversation />
				</Column>
			</>
		);
	if (cell === "TEXT.role.heading")
		return (
			<>
				<Column>
					<Tasked />
				</Column>
				<Column>
					<Scrolling scrolled={false} />
				</Column>
				<Column>
					<Scrolling scrolled />
				</Column>
			</>
		);
	return undefined;
}
