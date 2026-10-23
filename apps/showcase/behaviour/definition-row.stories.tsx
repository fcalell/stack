import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

// A row with a label at the pane's 320 px width, at the desktop density and, in
// a 375 px phone, the touch one: a title of words is one text run that truncates
// unless the row wraps it, whatever stands at a row's end is centred on the
// row's first line, and a label wraps beside a control.
const change = () => {};
const ID =
	"SHA256:uNiVxQ0aB3dE8fGhIjKlMnOpQrStUvWxYz0123456789uNiVxQ0aB3dE8fGhIjKlMnOpQrStUvWxYz0123k3Qz";
const LONG = "A value of words that is far too long for its room";
const LABEL = "Only what changed since you last looked";
const CUT = `${LONG}, and then a good many more words that no row can hold on one line`;

export default {
	title: "Behaviour/DefinitionRow",
} satisfies Meta;

function Pane(props: { children: React.ReactNode }) {
	return <div className="w-pane max-w-full">{props.children}</div>;
}

type Play = NonNullable<StoryObj["play"]>;

// The row is the box that stands directly in the sheet.
const rowOf = (element: HTMLElement) => {
	let row: HTMLElement | null = element;
	while (row && !row.parentElement?.classList.contains("rows-host"))
		row = row.parentElement;
	if (!row) throw new Error("the element has no row");
	return row;
};
const box = (element: Element) => element.getBoundingClientRect();
const middle = (element: Element) => box(element).top + box(element).height / 2;
// Whether the row's line stands under its label (touch) and not beside it.
const stacked = (label: Element, value: Element) =>
	middle(value) >= box(label).bottom - 1;

// Words are one text node with every space, whole where they fit; a title
// that is wrapped stands whole, one that is not is cut at its end; an
// identifier keeps its end, cut in its middle.
const words: Play = async ({ canvas }) => {
	for (const text of ["No history yet", "7.4 GB left", "This machine", "No"]) {
		const value = canvas.getByText(text);
		await expect(value.childNodes).toHaveLength(1);
		await expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
	}
	const wrapped = canvas.getByText(LONG);
	await expect(wrapped.scrollWidth).toBeLessThanOrEqual(wrapped.clientWidth);
	await expect(box(wrapped).right).toBeLessThanOrEqual(
		box(rowOf(wrapped)).right + 0.5,
	);
	const cut = canvas.getByText(CUT);
	// Cut at its end on one line; in the compact form (touch) it takes a second
	// line before it is cut.
	const line = Number.parseFloat(getComputedStyle(cut).lineHeight);
	await expect(
		cut.scrollWidth > cut.clientWidth || box(cut).height > line * 1.5,
	).toBe(true);
	await expect(box(cut).right).toBeLessThanOrEqual(box(rowOf(cut)).right + 0.5);
	await expect(canvas.getByText("k3Qz")).toBeVisible();
	const stem = canvas.getByText(/^SHA256/);
	await expect(stem.scrollWidth).toBeGreaterThan(stem.clientWidth);
};

export const ValueWords: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "expected-spend",
						label: "Expected spend",
						title: "No history yet",
					},
					{
						key: "disk",
						label: "Disk",
						title: "7.4 GB left",
					},
					{
						key: "signed-on",
						label: "Signed on",
						title: "This machine",
					},
					{ key: "held", label: "Held", title: "No" },
					{ key: "note", label: "Note", title: LONG, wrap: true },
					{ key: "cut", label: "Cut", title: CUT },
					{
						key: "key",
						label: "Key",
						title: { code: ID, copy: true },
					},
				]}
			/>
		</Pane>
	),
	play: words,
};

// What stands at a row's end (a value, an act, a switch) is centred on the
// row's first line, and a row with nothing there reserves no room, so its
// title ends at the row's inset. A row that opens draws no chevron.
const ends: Play = async ({ canvas }) => {
	const on = async (a: Element, b: Element) =>
		expect(Math.abs(middle(a) - middle(b))).toBeLessThan(1);
	const plain = rowOf(canvas.getByText("Plain"));
	await expect(
		box(plain).right - box(canvas.getByText("Plain value")).right,
	).toBeLessThan(20);
	await expect(plain.querySelectorAll(":empty")).toHaveLength(0);
	await expect(
		rowOf(canvas.getByText("Opens")).querySelector("svg"),
	).toBeNull();
	// The end group is centred on the row's line (the second column, under the
	// label on touch), whatever its lines.
	const line = (text: string) => {
		const found = canvas.getByText(text).closest("div");
		if (!found) throw new Error("the text has no line");
		return found;
	};
	await on(
		canvas.getByRole("button", { name: "Rename" }),
		line("Described value"),
	);
	const label = canvas.getByText("Switched");
	const toggle = canvas.getByRole("switch", { name: "Switched" });
	await on(toggle, line("A sentence under the label and the switch."));
	await expect(box(toggle).right).toBeLessThanOrEqual(
		box(rowOf(label)).right + 0.5,
	);
};

export const EndsOnTheCentre: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "plain",
						label: "Plain",
						title: "Plain value",
					},
					{
						key: "linked",
						label: "Linked",
						title: "Linked value",
						href: "#linked",
					},
					{
						key: "opens",
						label: "Opens",
						meta: ["A sentence under the label and the value."],
						title: "Opens value",
						href: "#opens",
					},
					{
						key: "plan",
						label: "Plan",
						meta: ["Your organisation manages it."],
						title: "Plan value",
					},
					{
						key: "described",
						label: "Described",
						meta: ["A sentence under the label and the value."],
						title: "Described value",
						act: { icon: "Pencil", label: "Rename", onAct: change },
					},
					{
						key: "switched",
						label: "Switched",
						meta: ["A sentence under the label and the switch."],
						switch: { checked: true, onChange: change },
					},
				]}
			/>
		</Pane>
	),
	play: ends,
};

// A wrapped title stands whole in the room its label leaves, from the label's
// first line; an identifier stays on that line and keeps its end.
const longValue: Play = async ({ canvas }) => {
	const label = canvas.getByText("Note");
	const value = canvas.getByText(LONG);
	const row = rowOf(label);
	await expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
	await expect(box(value).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await expect(box(value).top).toBeGreaterThanOrEqual(box(label).top - 1);
	const key = canvas.getByText(/^SHA256/);
	if (!stacked(canvas.getByText("Key"), key))
		await expect(
			Math.abs(middle(key) - middle(canvas.getByText("Key"))),
		).toBeLessThan(2);
	await expect(canvas.getByText("k3Qz")).toBeVisible();
};

export const LongValueUnderADescription: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "note",
						label: "Note",
						meta: ["A sentence under the label and the value."],
						title: LONG,
						wrap: true,
						href: "#note",
					},
					{
						key: "key",
						label: "Key",
						meta: ["A sentence under the label and the value."],
						title: { code: ID, copy: true },
					},
				]}
			/>
		</Pane>
	),
	play: longValue,
};

// A switch stays whole at the row's end, after the label; a short label keeps
// the height of any one-line row.
const wraps: Play = async ({ canvas }) => {
	const label = canvas.getByText(LABEL);
	const row = rowOf(label);
	const toggle = canvas.getByRole("switch", { name: LABEL });
	await expect(box(toggle).right).toBeLessThanOrEqual(box(row).right + 0.5);
	if (!stacked(label, toggle))
		await expect(box(label).right).toBeLessThanOrEqual(box(toggle).left + 0.5);
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
			<Section
				items={[
					{
						key: "definitionRow0",
						label: LABEL,
						switch: { checked: true, onChange: change },
					},
					{
						key: "short",
						label: "Short",
						switch: { checked: true, onChange: change },
					},
					{ key: "plain", label: "Plain", title: "Value" },
					{ key: "last", label: "Last", title: "Value" },
				]}
			/>
		</Pane>
	),
	play: wraps,
};

function touch(story: StoryObj): StoryObj {
	return {
		...story,
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

// A status title stays whole: its pill is never cut, and a status wider than
// the room is cut inside the row, never past it.
const SENTENCE = "Watches paused for usage, resuming at 1:17 PM tomorrow";

const statusWhole: Play = async ({ canvas }) => {
	const whole = canvas.getByText("Fetched 3 min ago");
	await expect(whole.scrollWidth).toBeLessThanOrEqual(whole.clientWidth);
	const label = canvas.getByText("Last fetch");
	if (!stacked(label, whole))
		await expect(box(label).right).toBeLessThanOrEqual(box(whole).left + 0.5);
	const long = canvas.getByText(SENTENCE);
	const row = rowOf(long);
	await expect(box(long).right).toBeLessThanOrEqual(box(row).right + 0.5);
	await expect(box(row).right).toBeGreaterThanOrEqual(box(whole).right - 0.5);
};

export const StatusValueStaysWhole: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{ key: "branch", label: "Branch", title: "main" },
					{
						key: "last-fetch",
						label: "Last fetch",
						title: { status: "done", label: "Fetched 3 min ago" },
					},
					{
						key: "usage",
						label: "Usage",
						title: { status: "waiting", label: SENTENCE },
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
			<Section
				items={[
					{ key: "branch", label: "Branch", title: "main" },
					{
						key: "runtime",
						label: "Runtime",
						meta: ["Claude Code 2.1.280"],
						title: {
							status: "done",
							label: "Claude, signed in, with a long account name",
						},
					},
					{
						key: "notes",
						label: "Notes",
						title: LONG,
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
			<Section
				items={[
					{ key: "plain", label: "Plain", title: "Value" },
					{
						key: "billing-cycle",
						label: "Billing cycle",
						pick: {
							label: "Billing cycle",
							options: CYCLES,
							value: cycle,
							onChange: setCycle,
						},
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

export const ValueWordsTouch = { ...touch(ValueWords), tags: ["touch"] };
export const EndsOnTheCentreTouch = {
	...touch(EndsOnTheCentre),
	tags: ["touch"],
};
export const LongValueUnderADescriptionTouch = {
	...touch(LongValueUnderADescription),
	tags: ["touch"],
};
export const LabelWrapsTouch = { ...touch(LabelWraps), tags: ["touch"] };
export const LabelKeepsItsWordTouch = {
	...touch(LabelKeepsItsWord),
	tags: ["touch"],
};
export const StatusValueStaysWholeTouch = {
	...touch(StatusValueStaysWhole),
	tags: ["touch"],
};

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
	const rows = (picks: readonly { label: string; value: string }[]) =>
		picks.map((pick) => ({
			key: pick.label,
			label: pick.label,
			pick: {
				label: pick.label,
				options: [{ value: pick.value, label: pick.value }],
				value: chosen[pick.label] ?? pick.value,
				onChange: (next: string) =>
					setChosen({ ...chosen, [pick.label]: next }),
			},
		}));
	// Two sheets, so the long label of one does not set the other's label column.
	return (
		<>
			<Section items={rows(PICKS)} />
			<Section items={rows([{ label: LABEL, value: LONG_OPTION }])} />
		</>
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

// A row that opens is one hit that spans the whole row, named by its label, so
// the element itself is what a press anywhere on the row lands on.
export const HitSpansTheRow: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "alone",
						label: "Alone",
						title: "Alone value",
						href: "#alone",
					},
					{
						key: "described",
						label: "Described",
						meta: ["A sentence under the label and the value."],
						title: "Described value",
						href: "#described",
					},
				]}
			/>
		</Pane>
	),
	play: async ({ canvas }) => {
		for (const name of ["Alone", "Described"]) {
			const link = canvas.getByRole("link", { name });
			const row = rowOf(link);
			// The hit rings inset, inside the row's current bar.
			await expect(Math.abs(box(link).left - box(row).left)).toBeLessThan(6);
			await expect(Math.abs(box(link).right - box(row).right)).toBeLessThan(1);
			await expect(Math.abs(box(link).height - box(row).height)).toBeLessThan(
				1,
			);
			const label = canvas.getByText(name);
			// A press beside the words, still inside the row, lands on the link.
			const x = (box(label).right + box(row).right) / 2;
			await expect(document.elementFromPoint(x, middle(label))).toBe(link);
		}
	},
};

// A meta line stands under the title in the title's column, left-aligned with
// it, a long one never taking room from the title, which stays whole beside
// the label. A locked row's reason stands in its end group, the title whole.
const WHY =
	"Where the workspace runs, its data is stored and its backups are kept; changing it moves all of them and takes a few minutes.";
const REGION = "Frankfurt, Germany";
const WHEN =
	"Renewal opens sixty days before the contract ends and closes a week after it.";

const ownLine: Play = async ({ canvas }) => {
	const value = canvas.getByText(REGION);
	const why = canvas.getByText(WHY);
	await expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
	await expect(box(why).top).toBeGreaterThanOrEqual(box(value).bottom - 0.5);
	await expect(Math.abs(box(why).left - box(value).left)).toBeLessThan(1);
	await expect(box(why).right).toBeLessThanOrEqual(
		box(rowOf(value)).right + 0.5,
	);
	const renewal = canvas.getByText("1 Nov 2026");
	const when = canvas.getByText(WHEN);
	await expect(box(when).top).toBeGreaterThanOrEqual(box(renewal).bottom - 0.5);
	await expect(box(when).right).toBeLessThanOrEqual(
		box(rowOf(renewal)).right + 0.5,
	);
	await expect(renewal.scrollWidth).toBeLessThanOrEqual(renewal.clientWidth);
};

export const DescriptionOwnLine: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "region",
						label: "Region",
						meta: [WHY],
						title: REGION,
					},
					{
						key: "renewal",
						label: "Contract renewal",
						meta: [WHEN],
						title: "1 Nov 2026",
						lock: { reason: "Held by CR-12, Ana" },
					},
				]}
			/>
		</Pane>
	),
	play: ownLine,
};
export const DescriptionOwnLineTouch = {
	...touch(DescriptionOwnLine),
	tags: ["touch"],
};

// A locked row's long reason is cut inside its end group rather than push the
// title past the row, and the lock keeps its glyph.
const HINT = "Ready: reopen the change set to edit it.";

export const LongHintLeavesTheValueItsRoom: StoryObj = {
	render: () => (
		<Pane>
			<Section
				items={[
					{
						key: "name",
						label: "Name",
						title: "Store detail",
						lock: { reason: HINT },
					},
					{
						key: "match",
						label: "Page type",
						title: "Store locator page",
						lock: { reason: HINT },
					},
					{
						key: "id",
						label: "Key",
						title: { code: ID, copy: true },
						lock: { reason: HINT },
					},
				]}
			/>
		</Pane>
	),
	play: async ({ canvas }) => {
		await document.fonts.ready;
		for (const text of ["Store detail", "Store locator page"]) {
			const value = canvas.getByText(text);
			await expect(box(value).right).toBeLessThanOrEqual(
				box(rowOf(value)).right + 0.5,
			);
		}
		const stem = canvas.getByText(/^SHA256/);
		await expect(stem.scrollWidth).toBeGreaterThan(stem.clientWidth);
		await expect(box(stem).right).toBeLessThanOrEqual(
			box(rowOf(stem)).right + 0.5,
		);
		for (const row of ["Name", "Page type", "Key"])
			await expect(
				rowOf(canvas.getByText(row)).querySelector("svg.lucide-lock"),
			).not.toBeNull();
	},
};
