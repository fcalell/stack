import { createLeave } from "@fcalell/ui-core/leave";
import type { ReactNode } from "react";

import { FileRowBase } from "../../components/file-row/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { RowBase } from "../../components/row/index.tsx";
import { SheetCard } from "../../components/section/card.tsx";
import { type Row, Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import {
	endedAt,
	type HeldState,
	isHeld,
	itemsAt,
	type Reads,
	readsAt,
} from "../waiting.ts";
import { StandInCard, Wide } from "./layout-context.tsx";
import { Paged } from "./more.tsx";
import { press, Stage } from "./overlay-stage.tsx";
import { isPaint } from "./painted.tsx";
import { Pressed } from "./pending.tsx";
import { Column } from "./place.tsx";
import {
	act,
	CHANGES,
	CHIPPED,
	DEPLOYS,
	ENTRIES,
	FACT_CHANGES,
	FACTS,
	FILES,
	HOPS,
	HOST_KEYS,
	HOSTS,
	IMPORTS,
	INVITES,
	issues,
	LEGS,
	NOTES,
	openFiles,
	PEOPLE,
	REVIEW,
	SHAPES,
	SOURCES,
	STAGES,
	STEPS,
	settings,
	TICKS,
	WORKSPACES,
} from "./section-rows.ts";

const INVITE = { icon: "UserPlus" as const, label: "Invite", onAct: act };
// An icon act carries no reason: the blocked frame draws the act as it stands.
const BLOCKED = { ...INVITE };
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
const DESCRIPTION = "People who can open this workspace.";
const MENU = [
	{ label: "Export members", onAct: act },
	{ label: "Remove all", onAct: act, destructive: true },
];
const HEADING = "TEXT.role.heading";

// The head's `more` trigger opens from the pointer (a popover's on its press
// down, a sheet's on its click).
function openMore(stage: HTMLElement) {
	const trigger = stage.querySelector<HTMLElement>("button");
	if (trigger?.getAttribute("aria-haspopup") === "menu") {
		trigger.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }),
		);
		trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	}
	press(trigger);
}

// The frame at touch is the page its rows decide their structure by (below
// `tablet` an act stands under the row's text, a lock shows its glyph alone);
// at the desktop it stands in no page, as a row inside a wide sheet does.
function Page(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full touch:@container/page">
			{props.children}
		</div>
	);
}

// The rows of a read's names, for a section over `Reads`.
const named = (names: readonly string[]): Row[] =>
	names.map((name) => ({ key: name, title: name }));

// ── The Section over parts (`children`) ─────────────────────────────────

// A Section over a read still to answer: its description, act and more paint,
// inert, with a body's leaves where they stand; the count is not drawn. The
// first holds the read as its root (it is busy), the second a selection of it.
function Waiting({ reads }: { reads: Reads }) {
	const { waiting } = reads;
	return (
		<Wide>
			<Section
				title="Members"
				description={waiting.at(() => DESCRIPTION)}
				act={waiting.at(() => INVITE)}
				more={waiting.at(() => MENU)}
				read={waiting}
			>
				<StandInCard />
			</Section>
			<Section
				title="Devices"
				act={{ icon: "Plus", label: "Add", onAct: act }}
				read={waiting.at((rows) => rows)}
			>
				<StandInCard />
			</Section>
			<Section
				title="People"
				description={waiting.at(() => DESCRIPTION)}
				act={waiting.at(() => INVITE)}
				items={waiting.at(named)}
			/>
		</Wide>
	);
}

// A Section over a read that holds rows: busy draws the mark after the title,
// stale and paused the line under the head; the body is the loaded tree.
function Held({ reads, state }: { reads: Reads; state: HeldState }) {
	return (
		<Wide>
			<Section title="Members" act={INVITE} read={reads[state]}>
				<StandInCard />
			</Section>
			<Section title="People" act={INVITE} items={reads[state].at(named)} />
		</Wide>
	);
}

// A read that fails stands in the body's place with its sentence and Retry,
// and one that answers not found with the missing form; the head stays, its
// description over the ended read drawing nothing.
function Failed(props: { first: Reads; second: Reads }) {
	const { missing, failing } = props.first;
	return (
		<Wide>
			<Section
				title="Members"
				description={failing.at(() => DESCRIPTION)}
				act={INVITE}
				read={failing}
			>
				<StandInCard />
			</Section>
			<Section title="Members" read={props.second.failing}>
				<StandInCard />
			</Section>
			<Section title="Members" read={missing}>
				<StandInCard />
			</Section>
			<Section title="People" items={failing.at(named)} />
			<Section title="People" items={missing.at(named)} />
		</Wide>
	);
}

// A read that answers nothing draws the Section's own `empty`, or the generic
// sentence, in a hairline frame.
function Nothing(props: { first: Reads; second: Reads }) {
	return (
		<Wide>
			<Section
				title="Webhooks"
				read={props.first.empty}
				empty={{
					sentence: "Add an endpoint to receive an event on each deploy.",
					act: { label: "Add endpoint", onAct: act },
				}}
			/>
			<Section title="Needs you" read={props.second.empty} />
		</Wide>
	);
}

function Members(props: { blocked?: boolean }) {
	return (
		<Section
			title="Members"
			description={DESCRIPTION}
			act={props.blocked ? BLOCKED : INVITE}
		>
			<StandInCard />
		</Section>
	);
}

// ── The Section over rows (`items`) ─────────────────────────────────────

// The sheet's forms by state, each over a read of its own that answers, never
// answers, fails, answers not found or answers none; nothing above holds it,
// so the sheet draws its own form.
function Ended(props: { id: string; state: "empty" | "error" }) {
	return endedAt<Row>(props.id, props.state).map(({ title, items }) => (
		<Section key={title} title={title} items={items} />
	));
}

// The facts of a card whose read failed, no frame above holding it: each row
// is the failed form itself, one that opens and one that does not, a counted
// one beside them.
function FailedFacts(props: { id: string }) {
	const failing = readsAt(props.id).failing;
	return (
		<Section
			items={[
				{
					label: "Region",
					meta: ["Where the workspace runs."],
					title: failing.at((rows) => rows.join(", ")),
					href: "#region",
				},
				{
					label: "Plan",
					meta: ["Your organisation manages it."],
					title: failing.at((rows) => rows.join(", ")),
				},
				{
					label: "Knowledge",
					title: failing.at((rows) => `${rows.length}`),
					href: "#knowledge",
				},
				{
					label: "Landings",
					title: failing.at((rows) => rows.join(", ")),
					act: { label: "Change the branch", onAct: () => {} },
				},
			]}
		/>
	);
}

const MORE_TITLES = {
	next: "Deploys",
	fetching: "Deploys, next page loading",
	failed: "Deploys, next page failed",
};

// The more row of a sheet over a pages read, in each state of it.
function More(props: { id: string }) {
	return (
		<Wide>
			<Paged
				id={`${props.id}/deploys`}
				rows={DEPLOYS}
				draw={(deploys, how) => (
					<Section title={MORE_TITLES[how]} items={deploys} />
				)}
			/>
			<Paged
				id={`${props.id}/workspaces`}
				rows={WORKSPACES}
				draw={(workspaces, how) => (
					<Section title={`Workspaces, ${how}`} items={workspaces} />
				)}
			/>
		</Wide>
	);
}

// Four sheets on a page as it ships, each in the frame's state: notes (a title
// over a meta line, no leading), deploys (an avatar leading, an age trailing),
// host keys (facts from data, copied) and allowed hosts (an add field over a
// sheet, the field live while the rows paint).
function Library(props: { frame: ShowcaseFrame }) {
	const { frame } = props;
	const at = (name: string, rows: Row[]) =>
		itemsAt(`${frame.id}/${name}`, frame.state, rows);
	const deploys: Row[] = [
		{
			key: "d1",
			leading: { avatar: { name: "Ana Ruiz" } },
			title: "Fix invoice rounding",
			trailing: { age: "2026-01-01T00:00:00Z" },
			href: "#d1",
		},
		{
			key: "d2",
			leading: { avatar: { name: "Ben Kaya" } },
			title: "Export cohorts",
			trailing: { age: "2026-01-01T00:00:00Z" },
			href: "#d2",
		},
		{
			key: "d3",
			leading: { avatar: { name: "Ema Okafor" } },
			title: "Retry webhooks",
			trailing: { age: "2026-01-01T00:00:00Z" },
			href: "#d3",
		},
	];
	return (
		<Column>
			<Place>
				<Pane title="Library">
					<Section
						title="Notes"
						items={at("notes", NOTES)}
						empty={{
							sentence: "Notes you write land here, newest first.",
							act: { label: "New note", onAct: act },
						}}
					/>
					<Section
						title="Deploys"
						items={at("deploys", deploys)}
						empty={{
							sentence: "Each deploy of the project lands here.",
							act: { label: "Deploy", onAct: act },
						}}
					/>
					<Section
						title="Host keys"
						items={at("keys", HOST_KEYS)}
						empty={{
							sentence: "The keys the host presents land here.",
							act: { label: "Scan host", onAct: act },
						}}
					/>
					<Section
						title="Allowed hosts"
						items={at("hosts", HOSTS)}
						empty={{ sentence: "Hosts you allow land here." }}
					></Section>
					<FormField label="Add host">
						<Input
							label="Add host"
							value=""
							onChange={act}
							placeholder="docs.example.org"
							act={{ icon: "Plus", label: "Add host", onAct: act }}
						/>
					</FormField>
				</Pane>
			</Place>
		</Column>
	);
}

// ── The row cells ───────────────────────────────────────────────────────

// A part is one Section of the rows a cell names, drawn in the frame's state:
// its rows at rest, its painted rows loading (over the loaded ones when `pair`
// sets the paint against what it stands in for), the first row current when
// selected.
interface Part {
	rows: () => Row[];
	// The label of the act the part holds pending: pressed once drawn, into an
	// act that never settles.
	pressed?: string;
}

const PARTS = {
	deploys: { rows: () => DEPLOYS },
	issues: { rows: issues },
	invites: { rows: () => INVITES },
	stages: { rows: () => STAGES },
	steps: { rows: () => STEPS, pressed: "Request review" },
	sources: { rows: () => SOURCES },
	entries: { rows: () => ENTRIES },
	changes: { rows: () => CHANGES },
	ticks: { rows: () => TICKS },
	hops: { rows: () => HOPS },
	legs: { rows: () => LEGS },
	imports: { rows: () => IMPORTS, pressed: "Import" },
	notes: { rows: () => NOTES },
	settings: { rows: () => settings("done") },
	factChanges: { rows: () => FACT_CHANGES },
	files: { rows: () => FILES },
} satisfies Record<string, Part>;
type PartName = keyof typeof PARTS;

// The parts a cell names, by the cell's name or its family's: the first match
// wins, a cell naming none draws a list Pane's rows (the first row current).
const CELL_PARTS: ReadonlyArray<readonly [string, readonly PartName[]]> = [
	["ROW_TITLE.form.dim", ["hops"]],
	["ROW_TITLE", ["deploys"]],
	["ROW_STEP", ["imports"]],
	["TREE_", ["legs"]],
	["CHANGE_MARK", ["changes", "factChanges"]],
	["CHECKBOX", ["ticks"]],
	["CHIP", ["deploys"]],
	["ICON", ["deploys"]],
	["BUTTON", ["steps"]],
	["FIELD", ["sources"]],
	["TEXT.role.meta", ["deploys"]],
	["TEXT.role.code", ["settings"]],
	["TEXT_STRONG", ["settings"]],
	["LINK", ["settings"]],
	["AVATAR", ["issues"]],
	["STATUS_DOT", ["stages", "settings"]],
	["STATE_CHIP", ["stages", "settings"]],
	["SPINNER", ["stages"]],
	["LINE_BOX", ["notes"]],
	["FILE", ["files"]],
];

// A line box is what the paint fills, so its cell draws the painted rows over
// the loaded rows they stand in for, at rest too.
const waits = (cell: string) => cell.startsWith("LINE_BOX");

// The first list row current, as the open record is.
const current = (rows: Row[]): Row[] =>
	rows.map((row, at) =>
		at === 0 && "title" in row ? { ...row, selected: true } : row,
	);

function drawPart(frame: ShowcaseFrame, name: PartName, pair: boolean) {
	const part: Part = PARTS[name];
	const { state } = frame;
	const all =
		name === "files" && state === "selected" ? openFiles() : part.rows();
	const held = (drawn: ReactNode) =>
		part.pressed === undefined ? (
			drawn
		) : (
			<Pressed label={part.pressed}>{drawn}</Pressed>
		);
	if (state === "loading" || (pair && state === "rest"))
		return held(
			<>
				<Section items={itemsAt(`${frame.id}/${name}`, "loading", all)} />
				{pair ? <Section items={all} /> : null}
			</>,
		);
	if (name === "files")
		return (
			<>
				<Section items={all} />
				{state === "rest" ? (
					<div className="flex flex-col gap-section w-list max-w-full px-page">
						<Section items={REVIEW} />
						<Section items={CHIPPED} />
					</div>
				) : null}
			</>
		);
	return held(<Section items={state === "selected" ? current(all) : all} />);
}

// A painted row beside the loaded one: every shape a row holds, loaded and
// then painted (the same props, every part painted).
function Shapes(props: { painted?: boolean }) {
	const rows = [...SHAPES, ...FACTS, ...REVIEW, ...CHIPPED];
	return (
		<SheetCard>
			{rows.map((row, at) => {
				if ("path" in row) {
					const { key, ...file } = row;
					return (
						<FileRowBase key={key} {...file} painted={props.painted} at={at} />
					);
				}
				const { key: _key, ...item } = row;
				return (
					<RowBase
						key={row.key ?? `row-${at}`}
						{...item}
						painted={props.painted}
						at={at}
					/>
				);
			})}
		</SheetCard>
	);
}

// By cell. The heading cell draws the Section's own forms in every state; the
// body cell draws a page of sheets in the states a read puts them in; every
// other cell draws the rows it names, loaded, painted and current.
export function drawSection(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const { state } = frame;
	if (isPaint(frame))
		return state === "rest" ? (
			<Wide>
				<Shapes />
				<Shapes painted />
			</Wide>
		) : undefined;
	const reads = readsAt(frame.id);
	const second = readsAt(`${frame.id}/2`);
	if (cell === HEADING) {
		if (isHeld(state)) return <Held reads={reads} state={state} />;
		if (state === "error")
			return (
				<>
					<Failed first={reads} second={second} />
					<Wide>
						<Ended id={frame.id} state="error" />
						<FailedFacts id={frame.id} />
					</Wide>
				</>
			);
		if (state === "empty")
			return (
				<>
					<Nothing first={reads} second={second} />
					<Wide>
						<Section
							title="Webhooks"
							description="Where Acme posts deploy events."
							read={readsAt(`${frame.id}/3`).empty}
							empty={{ act: { label: "Add endpoint", onAct: act } }}
						/>
						<Section
							title="Needs you"
							read={readsAt(`${frame.id}/4`).empty}
							empty={{ sentence: "Nothing needs you." }}
						/>
						<Section
							title="Reviews"
							description="Who looked at this deploy."
							read={readsAt(`${frame.id}/5`).empty}
						/>
						<Ended id={frame.id} state="empty" />
					</Wide>
				</>
			);
		if (state === "disabled")
			return (
				<Wide>
					<Members blocked />
					<TouchedContext value={TOUCHED}>
						<Members blocked />
					</TouchedContext>
				</Wide>
			);
		if (state === "loading") return <Waiting reads={reads} />;
		if (state === "more") return <More id={frame.id} />;
		return (
			<Wide>
				<Members />
				<Section title="Devices" act={INVITE} read={reads.ready}>
					<StandInCard />
				</Section>
				<Section title="Memory" description="What the workspace remembers.">
					<StandInCard />
				</Section>
				<Section title="People" items={PEOPLE} />
			</Wide>
		);
	}
	if (cell === "TEXT.role.body")
		return state === "more" ||
			isHeld(state) ||
			state === "disabled" ? undefined : (
			<Library frame={frame} />
		);
	// A `MENU` cell draws the head's `more` menu open: the popover on the
	// desktop, the sheet on touch.
	if (cell.startsWith("MENU"))
		return state === "rest" ? (
			<Stage contain={frame.density === "touch"} ready={openMore}>
				<Section title="People" more={MENU} items={PEOPLE} />
			</Stage>
		) : undefined;
	if (state === "error")
		return cell.startsWith("FIELD.state.error") ? (
			<Page>
				<Section
					items={SOURCES.filter(
						(row) => "entry" in row && row.entry?.error !== undefined,
					)}
				/>
			</Page>
		) : undefined;
	if (state !== "rest" && state !== "loading" && state !== "selected")
		return undefined;
	const names = CELL_PARTS.find(([prefix]) => cell.startsWith(prefix))?.[1] ?? [
		"issues" as const,
	];
	const folds = cell === "ICON.fit.body";
	const destructive = cell.endsWith(".act.destructive");
	return (
		<Page>
			{names.map((name) => (
				<div key={name} className="contents">
					{drawPart(frame, name, waits(cell))}
				</div>
			))}
			{state === "rest" && destructive ? (
				<Section
					title="Archived"
					act={{
						icon: "Trash2",
						label: "Delete all",
						onAct: act,
						destructive: true,
					}}
					items={PEOPLE}
				/>
			) : null}
			{state === "rest" && folds ? (
				<>
					<Section
						title="In progress"
						folded={false}
						act={{ icon: "Plus", label: "Add", onAct: act }}
						items={PEOPLE}
					/>
					<Section
						title="Done"
						folded
						act={{ icon: "Plus", label: "Add", onAct: act }}
						items={PEOPLE}
					/>
				</>
			) : null}
		</Page>
	);
}
