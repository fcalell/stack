import type { Datum, Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Option, RecordFact, Run } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
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
const COPY = [
	{ icon: "Copy" as const, label: "Copy URL", onAct: act },
	{ icon: "ExternalLink" as const, label: "Visit", onAct: act },
];

// A Pane that fills (a Canvas, a Thread) needs a Place with a height of its
// own: the page's, in the shell, is the viewport's.
function Tall(props: { children: ReactNode }) {
	return <div className="flex flex-col h-[40rem]">{props.children}</div>;
}

function Issues() {
	return (
		<Pane title="Issues">
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
		<Pane title="Fix invoice rounding" back="#">
			<Section title="Activity">
				<StandInRows />
			</Section>
		</Pane>
	);
}

// Each frame's Place names the page with its one `h1`, drawn apart from sight
// (the Shell does it from the current place); every Pane under it is the same
// `h2` whether it stands alone or beside others, and its Sections start at `h3`.
// One Pane: the page, its acts and more on the bar.
function One() {
	return (
		<Place title="Deploys">
			<Pane title="Deploys" acts={ACTIONS} more={MORE}>
				<StandInList />
			</Pane>
		</Place>
	);
}

const LONG_CONTEXT =
	"Release 14 calculated metrics and marketing channels draft";

// One Pane whose bar holds a title, the context pick and two acts: at 320 the
// title keeps a third of the row, and the pick's label truncates before it.
// The `long` form judges its own edge: the pick's label is a long change set's
// title, and the bar's title must still hold a third of the bar.
function Context(props: { draft?: boolean; long?: boolean }) {
	const [value, setValue] = useState<string | null>(
		props.draft || props.long ? "draft" : "live",
	);
	const box = useRef<HTMLDivElement>(null);
	// The frame judges its own edge in each form: the title keeps a third of the
	// bar, and the title, the pick (its chip inside its frame) and each act
	// stand clear of one another. An intersection is an error.
	const form = props.long ? "long" : props.draft ? "draft" : "live";
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
			if (props.long && held < row / 3 - 1)
				console.error(
					`the bar's title is squeezed to ${Math.round(held)} px of a ${Math.round(row)} px row by the context pick`,
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
			const words = (text: string) =>
				text
					.toLowerCase()
					.replace(/[^\p{L}\p{N}]+/gu, " ")
					.trim();
			const shown = words(
				(trigger as HTMLElement).innerText ?? trigger.textContent ?? "",
			);
			const named = words(trigger.getAttribute("aria-label") ?? "");
			if (shown && !named.startsWith(shown))
				console.error(
					`the context pick's name "${named}" does not start with its visible text "${shown}" (${form} context, ${Math.round(row)} px row)`,
				);
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
			<Place title="Pages">
				<Pane
					title="Core data layer"
					acts={ACTIONS}
					more={MORE}
					context={{
						label: "Context",
						value,
						onChange: setValue,
						options: [
							{ value: "live", label: "Live" },
							{
								value: "draft",
								label: props.long ? LONG_CONTEXT : "Release 14 draft",
								chip: { family: "amber", label: "Draft" },
							},
						],
					}}
					state={props.draft || props.long ? "attention" : "active"}
				>
					<StandInList />
				</Pane>
			</Place>
		</div>
	);
}

// Two: the list and the record it opened, whose back act is Close beside the
// list and Back where the record stands alone (below `tablet` of the Place).
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
			<Pane title="Ledger server" back="#">
				<Section title="Server" items={SERVER} />
			</Pane>
		</Place>
	);
}

// Three: the record opens a deeper Pane.
function Three() {
	return (
		<Place title="Issues">
			<Issues />
			<Record />
			<Pane title="Session" back="#">
				<Section title="Details">
					<StandInRows />
				</Section>
			</Pane>
		</Place>
	);
}

// Four: a Place never stands more than three, the oldest folding first (hidden,
// mounted), and the first standing Pane draws Back where the ones before it are
// folded, so each width stands the last one, two or three of these.
function Four() {
	return (
		<Place title="Issues">
			<Issues />
			<Record />
			<Pane title="Session" back="#">
				<Section title="Details">
					<StandInRows />
				</Section>
			</Pane>
			<Pane title="Step 3 of 5" back="#">
				<Section title="Output">
					<StandInRows />
				</Section>
			</Pane>
		</Place>
	);
}

// A page short enough that a failure or an empty state centres in what the
// body leaves.
function Short(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col h-[24rem]">
			<Place>{props.children}</Place>
		</div>
	);
}

// A Pane over a read still to answer: its title, acts and more paint, inert,
// the body's leaves paint where they stand, and the docked foot is inert.
function Waiting({ reads }: { reads: Reads }) {
	const { waiting } = reads;
	const [value, setValue] = useState("");
	return (
		<Short>
			<Pane
				title={waiting.at(() => "Deploys")}
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
		<Short>
			<Pane title="Deploys" read={reads[state]} acts={ACTIONS} more={MORE}>
				<Section title="Recent">
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A read that fails fills the page with its sentence and Retry, and one that
// answers not found with the missing form and a way back: the generic sentence,
// and the one a `noun` words. A record titled by its failed read keeps its
// place in the bar, and its failed form is the page's heading.
function Failed({ reads }: { reads: Reads }) {
	const { failing, missing } = reads;
	return (
		<>
			<Column>
				<Short>
					<Pane title="Deploys" read={failing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane title="Deploys" back="#" read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane title="Deploy" back="#" noun="deploy" read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane
						title={failing.at(() => NAME)}
						back="#"
						read={failing}
						record={{ within: WITHIN }}
					/>
				</Short>
			</Column>
			{/* A record that answers not found beside its list: its bar names the kind, the missing form's Back its one way out. */}
			<Column>
				<Short>
					<Place title="Deploys">
						<Issues />
						<Pane
							title={missing.at(() => NAME)}
							back="#"
							noun="deploy"
							read={missing}
						/>
					</Place>
				</Short>
			</Column>
			<Column>
				<Short>
					<Place title="Deploys">
						<Issues />
						<Pane title={missing.at(() => NAME)} back="#" read={missing} />
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
			<Short>
				<Pane
					title={NAME}
					back="#"
					record={{
						within: WITHIN,
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
			<Short>
				<Pane
					title={waitingText}
					back="#"
					record={{
						within: waitingText,
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
			<Short>
				<Pane
					title={loaded ? "Heating" : waitingText}
					back="#"
					record={{
						within: loaded ? "Home" : waitingText,
						overline: loaded ? ["Living room", "Climate"] : WAITING_OVERLINE,
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
			<Short>
				<Pane
					title={loaded ? "Heating" : waitingText}
					back="#"
					record={{
						within: loaded ? "Home" : waitingText,
						overline: loaded ? ["Living room", "Climate"] : WAITING_OVERLINE,
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
const EDGE_OVERLINE = ["Ready to land", "Code", "sailward", "2 min"];
// An address as long as the line: the overline stays one line, cut at its end,
// never broken after its `@` or its dots.
const EDGE_ADDRESS = [
	"Personal admin",
	'"Dr Alexandra Maria-Louise von Hohenzollern-Sigmaringen" <accounts@hohenzollern-sigmaringen-partners.example>',
	"6 min",
];
const EDGE_OUTSIDE: RecordFact = {
	flag: "Globe",
	label: "Outside content",
	words: false,
};
const EDGE_BRANCH: RecordFact = {
	code: "stead/job-8f3a2c71/refreshTokenRotationScheduleHandler",
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
				<Short>
					<div ref={edge} className="contents">
						<Pane
							title="Reply to the accounts team"
							back="#"
							record={{
								within: WITHIN,
								overline: EDGE_ADDRESS,
								facts: [{ tone: "waiting", label: "Waiting" }],
							}}
						/>
					</div>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane
						title="Land the cover cache change"
						back="#"
						record={{
							within: EDGE_WITHIN,
							overline: EDGE_OVERLINE,
							facts: [{ tone: "waiting", label: "Waiting" }, EDGE_OUTSIDE],
						}}
					/>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane
						title="Run the nightly import"
						back="#"
						record={{
							within: WITHIN,
							overline: OVERLINE,
							facts: [{ tone: "active", label: "Running" }, EDGE_BRANCH],
							description: EDGE_ABOUT,
						}}
					/>
				</Short>
			</Column>
			{/* Every kind of fact the head draws as a badge, beside the pick that acts: a status with its mark, a link, a count, a warning, a chip, a wordless mark at the end of the name's line, a fact longer than the line cut inside its badge. */}
			<Column>
				<Short>
					<Pane
						title="Trim the cover cache"
						back="#"
						record={{
							within: WITHIN,
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
			<Short>
				<Pane
					title={NAME}
					back="#"
					acts={[{ icon: "Pencil", label: "Edit", onAct: move }]}
					record={{
						within: WITHIN,
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
			<Short>
				<Pane
					title={NAME}
					back="#"
					record={{
						within: WITHIN,
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
		<Short>
			<Pane
				title={ready.at((rows) => `${rows.length} deploys`)}
				read={ready}
				acts={ACTIONS}
				more={MORE}
			>
				<Section title="Recent" read={ready.at((rows) => rows)}>
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A `cover` Pane spans the Place and the one before it is hidden, mounted.
export function Deployment() {
	return (
		<Place>
			<Issues />
			<Pane title="dpl_7Hp9aK" back="#" cover acts={COPY} more={MORE}>
				<Section title="Properties">
					<StandInRows />
				</Section>
			</Pane>
		</Place>
	);
}

// A `cover` Pane after a `wide` list takes the whole Place, `wide` or not, the
// list hidden; a Pane after the covering one holds the `list` width beside it.
function Covered(props: { deeper?: boolean }) {
	return (
		<Place title="Issues">
			<Pane title="Issues" wide>
				<Section title="Open">
					<StandInList />
				</Section>
			</Pane>
			<Pane title="dpl_7Hp9aK" back="#" cover wide>
				<Section title="Properties">
					<StandInRows />
				</Section>
			</Pane>
			{props.deeper ? (
				<Pane title="Step 3 of 5" back="#">
					<Section title="Output">
						<StandInRows />
					</Section>
				</Pane>
			) : null}
		</Place>
	);
}

// A `wide` Pane holding a Canvas: it fills the Pane, whose content is not held
// to the measure.
function Wide() {
	return (
		<Tall>
			<Place>
				<Pane fill title="Workflow" back="#" wide>
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
			<Place>
				<Pane title="Chats">
					<StandInList />
				</Pane>
				<Pane fill title="Why did the last deploy of api fail?" back="#">
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
			<Place>
				<Pane
					title="Projects"
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
				<Short>
					<Pane title="Deploys" read={props.second.empty} />
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane
						title="a-repository-with-a-name-longer-than-the-bar"
						record={{ within: "Knowledge" }}
						read={props.third.empty}
						empty={{ sentence: "This repo has no pages yet." }}
					/>
				</Short>
			</Column>
			<Column>
				<NoEmptyHeading>
					<Short>
						<Pane
							title=""
							record={{ within: "Knowledge" }}
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
		<Place>
			<Pane
				title="Assistant"
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
// one, two (a list, then its record), three, a covering one, a wide one
// holding a Canvas and one holding a Thread. The bar icon act draws one Pane
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
					<Context draft />
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
					<Three />
				</Column>
				<Column>
					<Four />
				</Column>
				<Column>
					<Deployment />
				</Column>
				<Column>
					<Covered />
				</Column>
				<Column>
					<Covered deeper />
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
