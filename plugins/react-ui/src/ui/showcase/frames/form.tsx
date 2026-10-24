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
	seats: number;
	budget?: number;
	due?: Date;
	urgent: boolean;
	notify?: boolean;
	channels?: ("email" | "slack" | "sms")[];
	owner?: string;
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

const TITLE = { label: "What should change?" };
const WHY = {
	label: "Why?",
	description: "What this is for, in a few words.",
	control: "prose",
} as const;
export const KIND = { label: "Kind of request", options: KINDS };
const PRIORITY = { label: "Priority" };
const SEATS = { label: "Seats" };
const BUDGET = { label: "Budget", description: "In euros." };
const DUE = { label: "By when?", description: "As YYYY-MM-DD." };
const URGENT = { label: "Urgent" };
const NOTIFY = { label: "Tell the requester" };
const CHANNELS = { label: "Channels" };
const OWNER = { label: "Owner", options: OWNERS };

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
// submit act into one that never settles; disabled the caller cannot submit.
// Loading, a form over a read and one of groups over a read wait beside it,
// painted. Busy, stale and paused draw both over a read that holds rows: the
// mark after the group's legend, the line under it or at the form's top.
export function drawForm(frame: ShowcaseFrame) {
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
