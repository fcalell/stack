import { ApiError } from "@fcalell/plugin-api/error";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Can, FormFields } from "@fcalell/ui-core/form";
import { type ReactNode, useEffect, useRef } from "react";
import { FormBody } from "../../components/form/base.tsx";
import { Form as Derived } from "../../components/form/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Text } from "../../components/text/index.tsx";
import type { Empty } from "../../lib/empty.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { isHeld, readsAt, waiting } from "../waiting.ts";
import { Judged } from "./judged.tsx";
import { isPaint } from "./painted.tsx";

const change = () => {};
const never = () => new Promise<void>(() => {});

// A field placed alone: its label over it, the description under it.
export function Labelled(props: {
	label: string;
	value: string;
	description?: string;
}) {
	return (
		<Input
			label={props.label}
			description={props.description}
			value={props.value}
			onChange={change}
		/>
	);
}

// A form of two fields and its bar over a read, in whichever form the read
// puts it: waiting (the fields' leaves paint, the filled act with them),
// failed, missing, empty or landed.
function Over(props: { read: Selection<unknown>; empty?: Empty }) {
	return (
		<FormBody
			in="page"
			read={props.read}
			empty={props.empty}
			bar={{ acts: [{ label: "Save", onAct: never }] }}
		>
			<Labelled label="Project name" value="acme-web" />
			<Labelled label="Region" value="Frankfurt, eu-central-1" />
		</FormBody>
	);
}

// A form of groups, each its own frame: the first over a read, the second
// always loaded, so one group's wait or failure never stands in the other's.
function Grouped(props: { read: Selection<unknown> }) {
	return (
		<FormBody
			in="page"
			groups={[
				{
					title: "General",
					read: props.read,
					fields: <Labelled label="Workspace name" value="Acme Inc" />,
				},
				{
					title: "Region",
					fields: <Labelled label="Region" value="Frankfurt, eu-central-1" />,
				},
			]}
		/>
	);
}

// The input of the showcase's `forms.submit` procedure, which `.stack/schema.ts`
// holds the schema of: a form over it derives every control.
interface Request {
	workspaceId: string;
	title: string;
	why?: string;
	kind: "change" | "measurement" | "question";
	priority?: "low" | "normal" | "high";
	scope?: "event" | "user";
	seats: number;
	budget?: number;
	due?: Date;
	urgent: boolean;
	notify?: boolean;
	channels?: ("email" | "slack" | "sms")[];
	owner?: string;
	directory?: string;
}

// `forms.submit` as the client hands it, running `run` in place of the wire.
function procedure(run: () => Promise<{ id: string }>) {
	const key = [["forms", "submit"], { type: "mutation" }] as const;
	return {
		call: (_input: Request) => run(),
		mutationKey: () => key,
		mutationOptions: () => ({ mutationKey: key, mutationFn: () => run() }),
	};
}
const NEVER = procedure(() => new Promise<{ id: string }>(() => {}));
// The server refuses the directory, quoting its path between backticks.
const REFUSED = procedure(() =>
	Promise.reject(
		new ApiError("BAD_REQUEST", {
			data: {
				issues: [
					{
						path: ["directory"],
						message: "no lead stands under `/srv/leads/mail-digest`",
					},
				],
			},
		}),
	),
);
export const SAVED = procedure(() => Promise.resolve({ id: "request-1" }));

const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
];
const KINDS = [
	{ value: "change", label: "A change" },
	{ value: "measurement", label: "A measurement" },
	{ value: "question", label: "A question" },
] as const;

const TITLE = { label: "Change" };
const WHY = {
	label: "Why?",
	description: "What this is for, in a few words.",
	control: "prose",
} as const;
export const KIND = { label: "Kind", options: KINDS };
const PRIORITY = { label: "Priority" };
const SEATS = { label: "Seats" };
const BUDGET = { label: "Budget", description: "In euros." };
const DUE = { label: "By when?", description: "As YYYY-MM-DD." };
const URGENT = { label: "Urgent" };
const NOTIFY = { label: "Notify" };
const CHANNELS = { label: "Channels" };
const OWNER = { label: "Owner", options: OWNERS };
// A machine name a person types: one line in the mono.
const DIRECTORY = {
	label: "Directory",
	description: "The directory's path on this machine.",
	control: "mono",
} as const;

const ALL: FormFields<Request> = {
	title: TITLE,
	why: WHY,
	kind: KIND,
	priority: PRIORITY,
	seats: SEATS,
	budget: BUDGET,
	due: DUE,
	urgent: URGENT,
	notify: NOTIFY,
	channels: CHANNELS,
	owner: OWNER,
	directory: DIRECTORY,
};

// What a request holds once it is filled in: the required fields of
// `forms.submit`.
export const FILLED = {
	title: "Add the checkout event",
	kind: "change",
	seats: 3,
	urgent: false,
} as const;

export const GIVEN = { workspaceId: "acme" };

// The loading frame presses its form's submit act once mounted, into an act
// that never settles.
function Submitted(props: { children: ReactNode }) {
	const frame = useRef<HTMLDivElement>(null);
	useEffect(() => {
		frame.current
			?.querySelector<HTMLButtonElement>("button[type=submit]")
			?.click();
	}, []);
	return (
		<div ref={frame} className="flex flex-col">
			{props.children}
		</div>
	);
}

function Flat(props: {
	act?: typeof SAVED;
	values?: Partial<Request>;
	can?: Can;
}) {
	return (
		<Derived
			act={props.act ?? SAVED}
			given={GIVEN}
			values={props.values}
			can={props.can}
			fields={ALL}
			submit={{ label: "Send request" }}
		/>
	);
}

function Grouped3() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			groups={[
				{
					title: "The request",
					description: "What it asks for.",
					fields: { title: TITLE, why: WHY, kind: KIND, owner: OWNER },
				},
				{
					title: "Limits",
					description: "How much and by when.",
					fields: { seats: SEATS, budget: BUDGET, due: DUE },
				},
				{
					title: "Notifications",
					description: "Who hears about it.",
					fields: { urgent: URGENT, notify: NOTIFY, channels: CHANNELS },
				},
			]}
		/>
	);
}

// A date line empty, empty with its own word and filled: it reads in the app's
// day style ("26 Oct 2026"), never the platform's "mm/dd/yyyy".
function Dates() {
	const given = {
		...GIVEN,
		title: FILLED.title,
		kind: FILLED.kind,
		seats: FILLED.seats,
		urgent: false,
	};
	return (
		<div className="flex flex-col gap-section">
			<Derived act={SAVED} given={given} fields={{ due: DUE }} />
			<Derived
				act={SAVED}
				given={given}
				fields={{ due: { ...DUE, empty: "Ongoing" } }}
			/>
			<Derived
				act={SAVED}
				given={given}
				values={{ due: new Date(2026, 9, 26) }}
				fields={{ due: DUE }}
			/>
		</div>
	);
}

// Picks empty and filled: a required pick shows its placeholder, an optional
// pick and an optional pick of several their empty word ("None"), and a field's
// own `empty` replaces it ("Every visit").
const PICKS: FormFields<Request> = {
	kind: KIND,
	priority: PRIORITY,
	channels: CHANNELS,
	owner: { ...OWNER, empty: "Every visit" },
};
// A pick whose schema defaults (`.default("event")`) always holds a value: no
// "Optional" under its label and no empty choice, beside a truly optional pick
// that keeps both.
function Defaulted() {
	const given = {
		...GIVEN,
		title: FILLED.title,
		seats: FILLED.seats,
		urgent: false,
	};
	return (
		<Derived
			act={SAVED}
			given={given}
			fields={{ kind: KIND, scope: { label: "Scope" }, priority: PRIORITY }}
		/>
	);
}
function Optional() {
	const given = {
		...GIVEN,
		title: FILLED.title,
		seats: FILLED.seats,
		urgent: false,
	};
	return (
		<div className="flex flex-col gap-section">
			<Derived act={SAVED} given={given} fields={PICKS} />
			<Derived
				act={SAVED}
				given={given}
				values={{
					kind: "change",
					priority: "high",
					channels: ["email", "slack"],
					owner: "ana",
				}}
				fields={PICKS}
			/>
		</div>
	);
}

// A path the server refused, the submit pressed once mounted: the mono line
// holds the path as the issue under it quotes it.
function Refused() {
	return (
		<Submitted>
			<Derived
				act={REFUSED}
				given={{ ...GIVEN, kind: FILLED.kind, urgent: FILLED.urgent }}
				values={{
					title: FILLED.title,
					seats: FILLED.seats,
					directory: "/srv/leads/mail-digest",
				}}
				fields={{ title: TITLE, seats: SEATS, directory: DIRECTORY }}
				submit={{ label: "Send request" }}
			/>
		</Submitted>
	);
}

// A form over a record that never arrives: the controls paint.
function Painted() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			values={waiting.at((): Partial<Request> => ({}))}
			fields={{ title: TITLE, kind: KIND, seats: SEATS, urgent: URGENT }}
		/>
	);
}

// The `TEXT.role.meta` cell (a field's description) draws a form of every
// derived control, the `TEXT.role.heading` cell (a group's title) a form of
// three groups, and `PAINT.kind.control` a form over a record that never
// arrives. At rest the form is filled in by hand; pending it has pressed its
// submit act into one that never settles; disabled the caller cannot submit;
// in error the `TEXT.role.meta` cell draws a mono path the server refused over
// the forms whose read failed.
// Loading, a form over a read and one of groups over a read wait beside it,
// painted. Busy, stale and paused draw both over a read that holds rows: the
// mark after the group's legend, the line under it or at the form's top.
// Long labels never starve the value column: a form whose labels are long
// sentences keeps every pick's and line's words whole. Every element that
// clips (an ellipsis, a hidden overflow) is judged for text cut by it.
function cutFaults(host: Element): string[] {
	const faults: string[] = [];
	// The value column of a run of rows keeps half its width at least, whatever
	// the length of the labels in the first.
	for (const run of host.querySelectorAll<HTMLElement>(".rows-host")) {
		const [label, value] = getComputedStyle(run)
			.gridTemplateColumns.split(" ")
			.map(Number.parseFloat);
		if (label === undefined || value === undefined) continue;
		if (value < (label + value) / 2)
			faults.push(
				`the value column is ${Math.round(value)} px beside a label column of ${Math.round(label)} px`,
			);
	}
	for (const el of host.querySelectorAll<HTMLElement>("*")) {
		if (el.clientWidth <= 2 || el.scrollWidth <= el.clientWidth + 1) continue;
		const { overflowX } = getComputedStyle(el);
		if (
			overflowX === "visible" ||
			overflowX === "auto" ||
			overflowX === "scroll"
		)
			continue;
		faults.push(
			`${el.textContent?.trim().slice(0, 40)} is cut at ${el.clientWidth} px of ${el.scrollWidth} px`,
		);
	}
	return faults;
}

// The labels are sentences, the way a consumer words a field.
const LONG: FormFields<Request> = {
	seats: SEATS,
	urgent: URGENT,
	title: {
		label: "Which storefront container should this change be published to",
	},
	kind: {
		...KIND,
		label: "Which kind of request is this, as the requester sees it",
	},
	owner: { ...OWNER, label: "Who on the storefront team owns it day to day" },
};

function LongLabels() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			values={{ ...FILLED, kind: "measurement", owner: "ana" }}
			fields={LONG}
			submit={{ label: "Send request" }}
		/>
	);
}

export function drawForm(frame: ShowcaseFrame) {
	return (
		<Judged name="Form" judge={cutFaults}>
			{drawnForm(frame)}
		</Judged>
	);
}

function drawnForm(frame: ShowcaseFrame) {
	if (isPaint(frame)) return frame.state === "rest" ? <Painted /> : undefined;
	const create = frame.cell.name === "TEXT.role.meta";
	const settings = frame.cell.name === "TEXT.role.heading";
	const loading = frame.state === "loading";
	const reads = readsAt(frame.id);
	const other = readsAt(`${frame.id}/2`);
	if (isHeld(frame.state))
		return (
			<div className="flex flex-col gap-section">
				<Over read={reads[frame.state]} />
				<Grouped read={readsAt(`${frame.id}/3`)[frame.state]} />
			</div>
		);
	if (frame.state === "error")
		return (
			<div className="flex flex-col gap-section">
				{create ? <Refused /> : null}
				<Over read={reads.failing} />
				<Over read={reads.missing} />
				<Grouped read={readsAt(`${frame.id}/3`).failing} />
			</div>
		);
	if (frame.state === "empty")
		return (
			<div className="flex flex-col gap-section">
				<Over
					read={reads.empty}
					empty={{ sentence: "There are no settings to change." }}
				/>
				<Over read={other.empty} />
				<Grouped read={reads.empty.at((rows) => rows)} />
			</div>
		);
	if (frame.state === "pending")
		return create ? (
			<Submitted>
				<Flat act={NEVER} values={FILLED} />
			</Submitted>
		) : undefined;
	if (frame.state === "disabled")
		return create ? (
			<Flat values={FILLED} can={["send", "request"]} />
		) : undefined;
	const drawn = create ? (
		<div className="flex flex-col gap-stack">
			<Text>
				A request is one procedure and its field labels. The form below stands
				as wide as this paragraph, the page's column.
			</Text>
			<Flat />
			<Optional />
			<Defaulted />
			<Dates />
			<LongLabels />
		</div>
	) : settings ? (
		<Grouped3 />
	) : undefined;
	if (drawn === undefined) return undefined;
	if (loading)
		return (
			<div className="flex flex-col gap-section">
				{drawn}
				<Over read={reads.waiting} />
				<Grouped read={other.waiting} />
			</div>
		);
	return (
		<div className="flex flex-col gap-section">
			{drawn}
			<Over read={reads.ready.at((rows) => rows)} />
		</div>
	);
}
