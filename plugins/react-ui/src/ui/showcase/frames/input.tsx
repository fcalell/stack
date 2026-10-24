import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FormBody } from "../../components/form/base.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { HeldInput } from "../../components/input/base.tsx";
import { Input, type InputKind } from "../../components/input/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { FieldOwned } from "../../lib/field.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { beside, isPaint, labelled } from "./painted.tsx";
import { hang } from "./pending.tsx";
import { Column, Place } from "./place.tsx";

const change = () => {};

const KINDS: Partial<Record<string, InputKind>> = {
	"FIELD_VALUE.kind.text": "text",
	"FIELD_VALUE.kind.code": "source",
	"FIELD_VALUE.kind.search": "search",
	"FIELD.trailing.act": "source",
};

const VALUES: Record<InputKind, string> = {
	text: "acme-inc",
	source: "whsec_8b1f4e2a9c7d3f06",
	search: "deploy failed",
	secret: "",
	number: "250",
	email: "",
	date: "2026-03-14",
};

const SHORT = "Marketing site for the launch.";
const LONG = [
	"Marketing site for the launch.",
	"Owns pricing and the changelog.",
	"Deploys from main on each merge.",
	"Previews post to the web channel.",
	"Archive after the launch review.",
].join("\n");
const SOURCE = Array.from(
	{ length: 40 },
	(_, line) => `line ${line + 1} of the page's source`,
).join("\n");

const ACCEPT = ["text/csv", ".har"];
const CHOSEN = {
	name: "leads-q3.csv",
	size: 48_200,
	type: "text/csv",
	blob: () => Promise.resolve(new Blob()),
};

// Each kind draws the cells its own parts are in, in the states it has: a
// cell shared by two kinds (`FIELD_VALUE`, `FIELD_PLACEHOLDER`) draws each
// beside the other.
const root = (frame: ShowcaseFrame) => frame.cell.name.split(".")[0] ?? "";
const states = (frame: ShowcaseFrame, ...of: ShowcaseFrame["state"][]) =>
	of.includes(frame.state);

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them; `FIELD.state.error` is in error in
// every state. `FIELD.trailing.act` draws the in-field copy act, and
// `FIELD.trailing.none` a number with its unit; `PAINT.kind.control` the field
// beside its painted form.
function drawLine(frame: ShowcaseFrame) {
	if (!states(frame, "rest", "disabled", "error")) return undefined;
	if (isPaint(frame))
		return beside(
			frame,
			labelled(
				<Input label="Workspace" value={VALUES.text} onChange={change} />,
			),
			labelled(<HeldInput value={VALUES.text} onChange={change} painted />),
		);
	const name = frame.cell.name;
	if (
		![
			"FIELD",
			"FIELD_VALUE",
			"FIELD_PLACEHOLDER",
			"FIELD_UNIT",
			"FIELD_GLYPH",
		].includes(root(frame))
	)
		return undefined;
	const unit = name === "FIELD.trailing.none";
	const kind = unit ? "number" : (KINDS[name] ?? "text");
	return (
		<FieldOwned value>
			<Field.Root
				invalid={frame.state === "error" || name === "FIELD.state.error"}
				disabled={frame.state === "disabled"}
			>
				{kind === "search" ? null : (
					<Field.Label className={text({ role: "body" })}>
						Workspace URL
					</Field.Label>
				)}
				<Input
					label="Workspace URL"
					kind={kind}
					value={VALUES[kind]}
					onChange={change}
					unit={unit ? "ms" : undefined}
					act={
						name === "FIELD.trailing.act"
							? { icon: "Copy", label: "Copy", onAct: change }
							: undefined
					}
				/>
			</Field.Root>
		</FieldOwned>
	);
}

// `TEXT_AREA.state.error` is in error in every state;
// `TEXT_AREA_BUDGET.state.error` is over its budget, the rest under it;
// `FIELD_VALUE.kind.code` is `source` in a page's `Form`, which fills the
// page's height and scrolls its long value inside; `search` has no form.
// `PAINT.kind.control` draws the box beside its painted form, a value that
// never arrives.
function drawProse(frame: ShowcaseFrame) {
	if (!states(frame, "rest", "disabled", "error")) return undefined;
	if (isPaint(frame))
		// Stacked, not side by side: a text area takes its column's width, which a
		// wrapping row would leave to its content.
		return frame.state === "rest" ? (
			<div className="flex flex-col gap-section">
				{labelled(
					<Input
						label="Workspace"
						kind="prose"
						value={SHORT}
						onChange={change}
					/>,
				)}
				{labelled(
					<Input
						label="Workspace"
						kind="prose"
						value={waitingText}
						onChange={change}
					/>,
				)}
			</div>
		) : undefined;
	const name = frame.cell.name;
	if (
		![
			"TEXT_AREA",
			"TEXT_AREA_BUDGET",
			"TEXT_AREA_VALUE",
			"FIELD_VALUE",
			"FIELD_PLACEHOLDER",
		].includes(root(frame))
	)
		return undefined;
	if (name === "FIELD_VALUE.kind.search") return undefined;
	if (name === "FIELD_VALUE.kind.code")
		return (
			<Column>
				<div className="flex flex-col h-dvh">
					<Place>
						<Pane title="Page source">
							<FormBody
								in="page"
								bar={{
									acts: [
										{ label: "Discard", onAct: change },
										{ label: "Save", onAct: change },
									],
								}}
							>
								<FormField
									label="Source"
									disabled={frame.state === "disabled"}
									error={
										frame.state === "error" ? "Not valid markdown." : undefined
									}
								>
									<Input
										label="Source"
										kind="prose"
										source
										value={SOURCE}
										onChange={change}
									/>
								</FormField>
							</FormBody>
						</Pane>
					</Place>
				</div>
			</Column>
		);
	const over = name === "TEXT_AREA_BUDGET.state.error";
	return (
		<FieldOwned value>
			<Field.Root
				invalid={frame.state === "error" || name === "TEXT_AREA.state.error"}
				disabled={frame.state === "disabled"}
			>
				<Field.Label className={text({ role: "body" })}>
					Description
				</Field.Label>
				<Input
					label="Description"
					kind="prose"
					value={over ? LONG : SHORT}
					onChange={change}
					budget={over ? 20 : 200}
				/>
			</Field.Root>
		</FieldOwned>
	);
}

// A code one digit short that types its last digit once mounted, so the check
// it starts never settles and the frame holds the look a real code would.
function Checking(props: { children: ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const input = rootRef.current?.querySelector("input");
		const set = Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set;
		if (!input || !set) return;
		set.call(input, "481902");
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}, []);
	return (
		<div ref={rootRef} className="contents">
			{props.children}
		</div>
	);
}

function Typed() {
	const [code, setCode] = useState("48190");
	return (
		<Input
			label="Code"
			kind="code"
			length={6}
			value={code}
			onChange={setCode}
			onComplete={hang}
		/>
	);
}

// The frame's `error` reaches the control through Base UI's `Field`, as a
// `FormField` puts it; `OTP_BOX.state.error` is in error in every state.
function drawCode(frame: ShowcaseFrame) {
	if (!states(frame, "rest", "pending", "error")) return undefined;
	if (
		!["OTP", "OTP_BOX", "OTP_DIGIT", "TEXT", "FIELD_ERROR_LINE"].includes(
			root(frame),
		)
	)
		return undefined;
	const pending = frame.state === "pending";
	return (
		<FieldOwned value>
			<Field.Root
				invalid={
					frame.state === "error" || frame.cell.name === "OTP_BOX.state.error"
				}
			>
				<Field.Label className={text({ role: "body" })}>Code</Field.Label>
				{pending ? (
					<Checking>
						<Typed />
					</Checking>
				) : (
					<Input
						label="Code"
						kind="code"
						length={6}
						value="481"
						onChange={change}
					/>
				)}
			</Field.Root>
		</FieldOwned>
	);
}

// A file control stands in a `FormField`, which labels it and draws the error
// line a refused file lands in; the frame's `error` and `disabled` reach the
// control through it. `FIELD.state.error` is in error in every state. The
// cells that draw the box's own parts stand empty (the word in its placeholder
// ink, the whole box the act); the rest hold a chosen file, its size after the
// name and the act that removes it.
const FILE_CELLS = [
	"FIELD.trailing.none",
	"FIELD.trailing.act",
	"FIELD.state.rest",
	"FIELD.state.error",
	"FIELD_VALUE.kind.text",
	"FIELD_PLACEHOLDER",
	"TEXT.role.meta",
	"FIELD_GLYPH",
	"FIELD_ERROR_LINE",
	"ICON.fit.control",
];

function drawFile(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	if (!states(frame, "rest", "disabled", "error", "empty")) return undefined;
	if (!FILE_CELLS.includes(name)) return undefined;
	const empty =
		frame.state === "empty" ||
		frame.state === "error" ||
		name === "FIELD.trailing.none" ||
		name === "FIELD.state.error" ||
		name === "FIELD_PLACEHOLDER";
	const error = frame.state === "error" || name === "FIELD.state.error";
	return (
		<FormField
			label="Leads file"
			error={error ? "Choose a CSV or HAR file." : undefined}
			disabled={frame.state === "disabled"}
		>
			<Input
				label="Leads file"
				kind="file"
				value={empty ? null : CHOSEN}
				onChange={change}
				accept={ACCEPT}
			/>
		</FormField>
	);
}

export function drawInput(frame: ShowcaseFrame) {
	const drawn = [
		drawLine(frame),
		drawProse(frame),
		drawCode(frame),
		drawFile(frame),
	];
	if (drawn.every((one) => one === undefined)) return undefined;
	return (
		<>
			{drawn.map((one, place) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: a kind is its position
				<div key={place} className="contents">
					{one}
				</div>
			))}
		</>
	);
}
