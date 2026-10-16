import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

// A definition row at the pane's 320 px width, at the desktop density and, in
// a 375 px phone, the touch one: a value of words is one text run, whatever
// stands at a row's end is centred on the row, and a label wraps beside a
// control.
const change = () => {};
const ID = "SHA256:uNiVxQ0aB3dE8fGhIjKlMnOpQrStUvWxYz0123k3Qz";
const LONG = "A value of words that is far too long for its room";
const LABEL = "Only what changed since you last looked";

export default {
	title: "Behaviour/DefinitionRow",
} satisfies Meta;

function Pane(props: { children: React.ReactNode }) {
	return <div className="w-pane max-w-full">{props.children}</div>;
}

type Play = NonNullable<StoryObj["play"]>;

const rowOf = (element: HTMLElement) => {
	const row = element.closest("div");
	if (!row) throw new Error("the label has no row");
	return row;
};
const box = (element: Element) => element.getBoundingClientRect();
const middle = (element: Element) => box(element).top + box(element).height / 2;

// Words are one text node with every space, whole where they fit and cut at
// their end where they do not; an identifier keeps its end.
const words: Play = async ({ canvas }) => {
	for (const text of ["No history yet", "7.4 GB left", "This machine", "No"]) {
		const value = canvas.getByText(text);
		await expect(value.childNodes).toHaveLength(1);
		await expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
	}
	const narrow = canvas.getByText(LONG);
	await expect(narrow.scrollWidth).toBeGreaterThan(narrow.clientWidth);
	await expect(canvas.getByText("k3Qz")).toBeVisible();
	const stem = canvas.getByText(/^SHA256/);
	await expect(stem.scrollWidth).toBeGreaterThan(stem.clientWidth);
};

export const ValueWords: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{
						key: "expected-spend",
						row: (
							<DefinitionRow label="Expected spend" value="No history yet" />
						),
					},
					{
						key: "disk",
						row: <DefinitionRow label="Disk" value="7.4 GB left" />,
					},
					{
						key: "signed-on",
						row: <DefinitionRow label="Signed on" value="This machine" />,
					},
					{ key: "held", row: <DefinitionRow label="Held" value="No" /> },
					{ key: "note", row: <DefinitionRow label="Note" value={LONG} /> },
					{ key: "key", row: <DefinitionRow label="Key" value={ID} /> },
				]}
			/>
		</Pane>
	),
	play: words,
};

// A row is a text group and an end group: whatever stands at the row's end (a
// value, a chevron, an act, a switch) is centred on the row, not on the label's
// line, with or without a description, and a row with nothing there reserves no
// room, so its value ends at the row's inset. Rows that end differently end
// their values at different x.
const ends: Play = async ({ canvas }) => {
	const on = async (value: Element, row: HTMLElement) =>
		expect(Math.abs(middle(value) - middle(row))).toBeLessThan(1);
	const plain = rowOf(canvas.getByText("Plain"));
	// No chevron, no empty square: the value ends at the row's inset, where a
	// chevron's row ends past it.
	await expect(
		box(plain).right - box(canvas.getByText("Plain value")).right,
	).toBeLessThan(20);
	await expect(box(canvas.getByText("Linked value")).right).toBeLessThan(
		box(canvas.getByText("Plain value")).right - 8,
	);
	await expect(plain.querySelectorAll(":empty")).toHaveLength(0);
	for (const name of ["Plain", "Linked", "Opens", "Plan", "Described"]) {
		await on(canvas.getByText(`${name} value`), rowOf(canvas.getByText(name)));
	}
	await on(
		canvas.getByRole("button", { name: "Rename" }),
		rowOf(canvas.getByText("Described")),
	);
	const opens = rowOf(canvas.getByText("Opens"));
	const chevron = opens.querySelector("svg");
	if (!chevron) throw new Error("the row has no chevron");
	await on(chevron, opens);
	await expect(
		Math.abs(middle(canvas.getByText("Opens value")) - middle(chevron)),
	).toBeLessThan(1);
	await on(
		canvas.getByRole("switch", { name: "Switched" }),
		rowOf(canvas.getByText("Switched")),
	);
};

export const EndsOnTheCentre: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{
						key: "plain",
						row: <DefinitionRow label="Plain" value="Plain value" />,
					},
					{
						key: "linked",
						row: (
							<DefinitionRow
								label="Linked"
								value="Linked value"
								href="#linked"
							/>
						),
					},
					{
						key: "opens",
						row: (
							<DefinitionRow
								label="Opens"
								description="A sentence under the label and the value."
								value="Opens value"
								href="#opens"
							/>
						),
					},
					{
						key: "plan",
						row: (
							<DefinitionRow
								label="Plan"
								description="Your organisation manages it."
								value="Plan value"
							/>
						),
					},
					{
						key: "described",
						row: (
							<DefinitionRow
								label="Described"
								description="A sentence under the label and the value."
								value="Described value"
								act={{ icon: "Pencil", label: "Rename", onAct: change }}
							/>
						),
					},
					{
						key: "switched",
						row: (
							<DefinitionRow
								label="Switched"
								description="A sentence under the label and the switch."
								switch={{ checked: true, onChange: change }}
							/>
						),
					},
				]}
			/>
		</Pane>
	),
	play: ends,
};

// A value too long for its row is cut at its end, the label whole beside it,
// and stays on the row's centre under a description; an identifier keeps its
// end.
const longValue: Play = async ({ canvas }) => {
	const label = canvas.getByText("Note");
	const value = canvas.getByText(LONG);
	const row = rowOf(label);
	await expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
	await expect(box(value).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await expect(box(label).right).toBeLessThanOrEqual(box(value).left + 0.5);
	await expect(Math.abs(middle(value) - middle(row))).toBeLessThan(1);
	const key = canvas.getByText(/^SHA256/);
	await expect(
		Math.abs(middle(key) - middle(rowOf(canvas.getByText("Key")))),
	).toBeLessThan(1);
	await expect(canvas.getByText("k3Qz")).toBeVisible();
};

export const LongValueUnderADescription: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{
						key: "note",
						row: (
							<DefinitionRow
								label="Note"
								description="A sentence under the label and the value."
								value={LONG}
								href="#note"
							/>
						),
					},
					{
						key: "key",
						row: (
							<DefinitionRow
								label="Key"
								description="A sentence under the label and the value."
								value={ID}
							/>
						),
					},
				]}
			/>
		</Pane>
	),
	play: longValue,
};

// A sentence label wraps beside a switch that stays whole at the row's end and
// centred on the label; a short label keeps the height of any one-line row.
const wraps: Play = async ({ canvas }) => {
	const label = canvas.getByText(LABEL);
	const row = rowOf(label);
	const toggle = canvas.getByRole("switch", { name: LABEL });
	await expect(box(label).height).toBeGreaterThan(
		box(canvas.getByText("Short")).height * 1.5,
	);
	await expect(box(toggle).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await expect(box(label).right).toBeLessThanOrEqual(box(toggle).left + 0.5);
	await expect(Math.abs(middle(toggle) - middle(label))).toBeLessThan(1);
	await expect(box(toggle).width).toBeGreaterThanOrEqual(24);
	const short = rowOf(canvas.getByText("Short"));
	const plain = rowOf(canvas.getByText("Plain"));
	await expect(Math.abs(box(short).height - box(plain).height)).toBeLessThan(
		0.5,
	);
};

export const LabelWraps: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{
						key: "definitionRow0",
						row: (
							<DefinitionRow
								label={LABEL}
								switch={{ checked: true, onChange: change }}
							/>
						),
					},
					{
						key: "short",
						row: (
							<DefinitionRow
								label="Short"
								switch={{ checked: true, onChange: change }}
							/>
						),
					},
					{ key: "plain", row: <DefinitionRow label="Plain" value="Value" /> },
					{ key: "last", row: <DefinitionRow label="Last" value="Value" /> },
				]}
			/>
		</Pane>
	),
	play: wraps,
};

function touch(story: StoryObj): StoryObj {
	return {
		...story,
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: "375px", height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

// A status value stays whole: the label wraps to the room it leaves, a status
// wider than three quarters of the line is the one that is cut,
// and nothing passes the row.
const SENTENCE = "Watches paused for usage, resuming at 1:17 PM tomorrow";

const statusWhole: Play = async ({ canvas }) => {
	const whole = canvas.getByText("Fetched 3 min ago");
	await expect(whole.scrollWidth).toBeLessThanOrEqual(whole.clientWidth);
	const label = canvas.getByText("Last fetch of the remote's refs");
	await expect(box(label).height).toBeGreaterThan(
		box(canvas.getByText("Branch")).height * 1.5,
	);
	await expect(box(label).right).toBeLessThanOrEqual(box(whole).left + 0.5);
	const long = canvas.getByText(SENTENCE);
	await expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
	const row = rowOf(long);
	await expect(box(long).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await expect(box(rowOf(label)).right).toBeGreaterThanOrEqual(
		box(whole).right - 0.5,
	);
};

export const StatusValueStaysWhole: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{ key: "branch", row: <DefinitionRow label="Branch" value="main" /> },
					{
						key: "last-fetch-of-the-remote-s-refs",
						row: (
							<DefinitionRow
								label="Last fetch of the remote's refs"
								value={{ status: "done", label: "Fetched 3 min ago" }}
							/>
						),
					},
					{
						key: "usage",
						row: (
							<DefinitionRow
								label="Usage"
								value={{ status: "waiting", label: SENTENCE }}
							/>
						),
					},
				]}
			/>
		</Pane>
	),
	play: statusWhole,
};

// A one-word label never breaks inside the word, whatever its value: the
// value, a status or words, is the one that gives way.
const oneWord: Play = async ({ canvas }) => {
	for (const name of ["Runtime", "Notes"]) {
		const label = canvas.getByText(name);
		const text = document.createRange();
		text.selectNodeContents(label);
		await expect(text.getClientRects()).toHaveLength(1);
		await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
	}
	const value = canvas.getByText("Claude, signed in, with a long account name");
	await expect(box(value).right).toBeLessThanOrEqual(
		box(rowOf(value)).right + 0.5,
	);
};

export const LabelKeepsItsWord: StoryObj = {
	render: () => (
		<Pane>
			<Group
				items={[
					{ key: "branch", row: <DefinitionRow label="Branch" value="main" /> },
					{
						key: "runtime",
						row: (
							<DefinitionRow
								label="Runtime"
								description="Claude Code 2.1.280"
								value={{
									status: "done",
									label: "Claude, signed in, with a long account name",
								}}
							/>
						),
					},
					{
						key: "notes",
						row: <DefinitionRow label="Notes" value={LONG} />,
					},
				]}
			/>
		</Pane>
	),
	play: oneWord,
};

// A pick row draws the picker at the row's value position, named by the row's
// label: it opens its options, and a picked option changes the value in place
// and closes the list.
const CYCLES = [
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

function Cycle() {
	const [cycle, setCycle] = useState("monthly");
	return (
		<Pane>
			<Group
				items={[
					{ key: "plain", row: <DefinitionRow label="Plain" value="Value" /> },
					{
						key: "billing-cycle",
						row: (
							<DefinitionRow
								label="Billing cycle"
								pick={{
									label: "Billing cycle",
									options: CYCLES,
									value: cycle,
									onChange: setCycle,
								}}
							/>
						),
					},
				]}
			/>
		</Pane>
	);
}

const picks: Play = async ({ canvas, userEvent }) => {
	const trigger = canvas.getByRole("combobox", { name: /Billing cycle/ });
	await expect(trigger).toHaveTextContent("Monthly");
	const row = rowOf(canvas.getByText("Billing cycle"));
	await expect(box(trigger).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await userEvent.click(trigger);
	await screen.findByRole("listbox");
	const options = screen.getAllByRole("option");
	await expect(options).toHaveLength(2);
	await userEvent.click(options[1] as HTMLElement);
	await waitFor(() => expect(trigger).toHaveTextContent("Yearly"));
	await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
};

export const ValuePicked: StoryObj = {
	render: () => <Cycle />,
	play: picks,
};

export const ValueWordsTouch = touch(ValueWords);
export const EndsOnTheCentreTouch = touch(EndsOnTheCentre);
export const LongValueUnderADescriptionTouch = touch(
	LongValueUnderADescription,
);
export const LabelWrapsTouch = touch(LabelWraps);
export const LabelKeepsItsWordTouch = touch(LabelKeepsItsWord);
export const StatusValueStaysWholeTouch = touch(StatusValueStaysWhole);

// A fact's pick draws its chosen option at the row's end, whole: a Stead-length
// value (a duration, a clock time, a cadence) is never cut with room to spare,
// at the pane's 320 px and at a wide page, while an option too long for its
// column, beside a label that wraps, still truncates inside it.
const PICKS = [
	{ label: "Idle after", value: "30 minutes" },
	{ label: "Quiet from", value: "22:00" },
	{ label: "Digest", value: "Every day" },
];
const LONG_OPTION = "An option far too long to fit the room its row leaves";

function Picks() {
	const [chosen, setChosen] = useState<Record<string, string>>({
		...Object.fromEntries(PICKS.map((pick) => [pick.label, pick.value])),
		[LABEL]: LONG_OPTION,
	});
	return (
		<Group
			items={[...PICKS, { label: LABEL, value: LONG_OPTION }].map((pick) => ({
				key: pick.label,
				row: (
					<DefinitionRow
						label={pick.label}
						pick={{
							label: pick.label,
							options: [{ value: pick.value, label: pick.value }],
							value: chosen[pick.label] ?? pick.value,
							onChange: (next) => setChosen({ ...chosen, [pick.label]: next }),
						}}
					/>
				),
			}))}
		/>
	);
}

function wholeAt(width: number): StoryObj {
	return {
		render: () => (
			<div style={{ width }} className="max-w-none">
				<Picks />
			</div>
		),
		play: async ({ canvas }) => {
			for (const { value } of PICKS) {
				const shown = canvas.getByText(value);
				await expect(shown.scrollWidth).toBeLessThanOrEqual(shown.clientWidth);
			}
			const long = canvas.getByText(LONG_OPTION);
			const row = rowOf(long);
			await expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
			await expect(box(long).right).toBeLessThanOrEqual(box(row).right + 0.5);
			await expect(box(canvas.getByText(LABEL)).right).toBeLessThanOrEqual(
				box(long).left + 0.5,
			);
		},
	};
}

export const PickValueWhole320 = wholeAt(320);
export const PickValueWhole1280 = wholeAt(1280);
export const PickValueWhole1920 = wholeAt(1920);
