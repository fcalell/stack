import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, type within } from "storybook/test";

const pressed = fn();

// A row is a text group (the title over the meta line) and an end group (the
// trailing value, the status, the acts) centred on the row: the value and the
// status never stand on the meta line, and a row with nothing at its end draws
// none.
export default {
	title: "Behaviour/ListRowEnd",
} satisfies Meta;

const centre = (element: Element) => {
	const box = element.getBoundingClientRect();
	return (box.top + box.bottom) / 2;
};
const right = (element: Element) => element.getBoundingClientRect().right;
const left = (element: Element) => element.getBoundingClientRect().left;
const near = (a: number, b: number, by = 1) =>
	expect(Math.abs(a - b)).toBeLessThanOrEqual(by);

const rowOf = (canvas: ReturnType<typeof within>, name: string) => {
	const row = canvas.getByRole("link", { name }).parentElement;
	if (!row) throw new Error(`the row ${name} has no box`);
	return row;
};

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width = 375): StoryObj {
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
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

function Column(props: { width?: number; children: React.ReactNode }) {
	return (
		<div
			data-testid="column"
			style={{ width: props.width ?? 400 }}
			className="max-w-full"
		>
			{props.children}
		</div>
	);
}

// A compact row (touch, or a column too narrow to hold the title, its meta and
// its end on one line) carries its value at the end of its meta line, under
// the title; a row that is one line carries it in its end group.
export const ValueEndsTheMetaLine: StoryObj = {
	render: () => (
		<Column>
			<Section
				items={[
					{
						key: "row",
						title: "Sign-in from a second device",
						meta: ["implementing", "pass 1"],
						trailing: { value: "18 min" },
						href: "#value",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const meta = canvas.getByText(/pass 1 · 18 min$/);
		const title = canvas.getByText("Sign-in from a second device");
		await expect(centre(meta)).toBeGreaterThan(centre(title));
		await expect(right(meta)).toBeLessThanOrEqual(
			right(rowOf(canvas, "Sign-in from a second device")) + 0.5,
		);
	},
};
export const ValueEndsTheMetaLineTouch = {
	...touch(ValueEndsTheMetaLine),
	tags: ["touch"],
};

// The end group of a one-line row is on the row's centre, in one order: the
// value, then the status.
export const ValueThenStatus: StoryObj = {
	render: () => (
		<Column width={640}>
			<Section
				items={[
					{
						key: "row",
						title: "Deploy api to production",
						trailing: { value: "40 min" },
						status: { tone: "failed", label: "Failed" },
						href: "#pair",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Deploy api to production");
		const value = canvas.getByText("40 min");
		const status = canvas.getByText("Failed");
		await near(centre(value), centre(row));
		await near(centre(status), centre(row));
		await expect(right(value)).toBeLessThanOrEqual(left(status) + 0.5);
		await expect(row.querySelector("svg.lucide-chevron-right")).toBeNull();
	},
};
export const ValueThenStatusTouch = {
	...touch(ValueThenStatus, 640),
	tags: ["touch"],
};

// A status ends a two-line row on the row's centre, never on the meta line.
export const StatusEndsTheRow: StoryObj = {
	render: () => (
		<Column>
			<Section
				items={[
					{
						key: "row",
						title: "Rename the flag",
						meta: ["Rename the flag to --strict", "round 1"],
						status: { tone: "waiting", label: "Waiting for you" },
						href: "#status",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const title = canvas.getByText("Rename the flag", { exact: true });
		const meta = canvas.getByText(/^Rename the flag to/);
		const row = rowOf(canvas, "Rename the flag");
		// The word beside the title, or its dot alone where the row is compact.
		const mark =
			canvas.queryByText("Waiting for you", { exact: true }) ??
			row.querySelector("[role='img']");
		if (!mark) throw new Error("the row draws no status");
		await near(centre(mark), centre(row), 2);
		await expect(centre(meta)).toBeGreaterThan(centre(title));
	},
};
export const StatusEndsTheRowTouch = {
	...touch(StatusEndsTheRow),
	tags: ["touch"],
};

// A status that used to sit alone on the meta line leaves it: the row is one
// line, as high as a row with no status, the status at its end.
export const StatusAloneIsOneLine: StoryObj = {
	render: () => (
		<Column>
			<Section items={[{ key: "row", title: "Plain", href: "#plain" }]} />
			<Section
				items={[
					{
						key: "row",
						title: "Install",
						status: { tone: "done", label: "Ready" },
						href: "#install",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const plain = rowOf(canvas, "Plain");
		const row = rowOf(canvas, "Install");
		await near(
			row.getBoundingClientRect().height,
			plain.getBoundingClientRect().height,
			0.5,
		);
		await near(centre(canvas.getByText("Ready")), centre(row));
		// The text group holds the title and nothing under it.
		await expect(
			canvas.getByText("Install").parentElement?.children,
		).toHaveLength(1);
	},
};
export const StatusAloneIsOneLineTouch = {
	...touch(StatusAloneIsOneLine),
	tags: ["touch"],
};

// A row that holds an entry stands its end value on the row's middle: the
// title and the input keep their lines, the value is not on the first.
export const WholeEntryRow: StoryObj = {
	render: () => (
		<Column>
			<Section
				items={[
					{
						key: "row",
						title: "Help centre",
						trailing: { value: "3 min" },
						entry: {
							label: "Address",
							field: { value: "", onChange: () => {} },
							placeholder: "Enter a full address",
							act: { label: "Import", onAct: pressed },
						},
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const value = canvas.getByText("3 min");
		const row = value.closest(".relative.flex");
		if (!row) throw new Error("the row has no box");
		await near(centre(value), centre(row));
	},
};
export const WholeEntryRowTouch = { ...touch(WholeEntryRow), tags: ["touch"] };

// A title that wraps whole keeps its leading on its first line, and the value,
// the status and the acts stand on the row's middle.
const PASSAGE =
	"Ana asked that every release note names the people whose work shipped, so the changelog reads as a record of the team and never as a list of tickets alone.";

export const WrappedTitle: StoryObj = {
	render: () => (
		<Column width={360}>
			<Section
				items={[
					{
						key: "row",
						wrap: true,
						leading: { icon: "File" },
						title: PASSAGE,
						trailing: { value: "2 hr" },
						href: "#wrapped",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, PASSAGE);
		const value = canvas.getByText("2 hr");
		const glyph = row.querySelector("svg.lucide-file");
		if (!glyph) throw new Error("the row draws no leading glyph");
		await near(centre(value), centre(row));
		// The leading stands on the first line, above the row's middle.
		await expect(centre(glyph)).toBeLessThan(centre(row) - 8);
		await expect(row.querySelector("svg.lucide-chevron-right")).toBeNull();
	},
};
export const WrappedTitleTouch = { ...touch(WrappedTitle), tags: ["touch"] };

// A value too long for its row in a 320 px column: the row never overflows, the
// text group keeps two fifths of the row's content width (the Pane head's floor), the value is cut with an
// ellipsis, and the title keeps its floor.
const LONG = "Production · europe-west-1 · 2 hr 14 min";

export const LongValueAt320: StoryObj = {
	render: () => (
		<Column width={320}>
			<Section
				items={[
					{
						key: "row",
						title: "Checkout redesign",
						trailing: { value: LONG },
						href: "#long",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Checkout redesign");
		const value = canvas.getByText(LONG);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		await expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
		const style = getComputedStyle(row);
		const inner =
			row.clientWidth -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight);
		const title = canvas.getByText("Checkout redesign");
		const text = title.parentElement;
		if (!text) throw new Error("the text group has no box");
		await expect(text.getBoundingClientRect().width).toBeGreaterThanOrEqual(
			inner * 0.4 - Number.parseFloat(style.columnGap) - 1,
		);
		await near(centre(value), centre(row));
	},
};
export const LongValueAt320Touch = {
	...touch(LongValueAt320, 320),
	tags: ["touch"],
};

// A row with nothing at its end draws no end group and holds no empty box.
export const NothingAtTheEnd: StoryObj = {
	render: () => (
		<Column>
			<Section
				items={[{ key: "row", title: "Static", meta: ["no value, no act"] }]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = canvas.getByText("Static").closest(".relative.flex");
		if (!row) throw new Error("the row has no box");
		await expect(row.children).toHaveLength(1);
		await expect(row.querySelector("[aria-hidden]:empty")).toBeNull();
	},
};
export const NothingAtTheEndTouch = {
	...touch(NothingAtTheEnd),
	tags: ["touch"],
};

// A row's marks join its end group after the value, in one line, none left on
// the meta line, and none ever dropped.
export const MarksBesideTheValue: StoryObj = {
	render: () => (
		<Column width={320}>
			<Section
				items={[
					{
						key: "row",
						title: "Dara Novak",
						trailing: { value: "1 wk" },
						chip: { family: "violet", label: "Member" },
						href: "#marks",
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Dara Novak");
		const value = canvas.getByText("1 wk");
		const chip = canvas.getByText("Member");
		await near(centre(value), centre(row));
		await near(centre(chip), centre(row), 2);
		await expect(right(value)).toBeLessThanOrEqual(left(chip) + 0.5);
		await expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
	},
};
export const MarksBesideTheValueTouch = {
	...touch(MarksBesideTheValue, 320),
	tags: ["touch"],
};

// The text group's floor holds with everything else in the row: a leading
// avatar, the more act, and the value over a chip and a status (a deploys list
// at 320). The group is at least two fifths of the row's content width less the
// row's gap, and the status still draws.
export const TextFloorBesideEverything: StoryObj = {
	render: () => (
		<Column width={320}>
			<Section
				items={[
					{
						key: "row",
						leading: { avatar: { name: "Ana Ruiz" } },
						title: "Cache the build output",
						meta: ["a41c9e2", "main"],
						trailing: { age: new Date(Date.now() - 2 * 60_000).toISOString() },
						chip: { family: "teal", label: "Production" },
						status: { tone: "running", label: "Building" },
						more: [{ label: "Copy", icon: "Copy", onAct: pressed }],
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const title = canvas.getByText("Cache the build output");
		const text = title.parentElement;
		const row = text?.parentElement;
		if (!text || !row) throw new Error("the row has no box");
		const style = getComputedStyle(row);
		const inner =
			row.clientWidth -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight);
		await expect(text.getBoundingClientRect().width).toBeGreaterThanOrEqual(
			inner * 0.4 - Number.parseFloat(style.columnGap) - 1,
		);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		// The status draws: its word whole, or its dot alone where the word does
		// not fit beside the group's floor (the chip folds away,
		// `ListRowMarksFold`), never the word cut.
		const word = canvas.getByText("Building");
		const mark = word.parentElement;
		if (!mark) throw new Error("the status has no box");
		await expect(mark.getBoundingClientRect().width).toBeGreaterThan(0);
		if (getComputedStyle(word).opacity !== "0")
			await expect(word.scrollWidth).toBeLessThanOrEqual(word.clientWidth);
	},
};

// The slot a mark stands in: the row's own child that holds it.
const slotOf = (row: Element, mark: Element) => {
	let slot: Element | null = mark;
	while (slot && slot.parentElement !== row) slot = slot.parentElement;
	if (!slot) throw new Error("the mark stands in no slot of the row");
	return slot;
};
const width = (element: Element) => element.getBoundingClientRect().width;
const columnGap = (element: Element) =>
	Number.parseFloat(getComputedStyle(element).columnGap);

// A long title beside a leading status dot and a trailing age at 320: the room
// the title lacks is the row's own, the card's padding, the leading slot at the
// status mark's room (narrower than the slot of a glyph's row beside it), the
// end group (the age alone: the row is the target, so no mark takes a square)
// and the two gaps, nothing else.
const RECONCILE = "Reconcile the staging database with the production schema";

export const EndGroupIsItsContentAt320: StoryObj = {
	tags: ["touch"],
	render: () => (
		<Column width={320}>
			<Section
				items={[
					{
						key: "row",
						leading: { status: "active" },
						title: RECONCILE,
						trailing: { age: new Date(Date.now() - 8 * 60_000).toISOString() },
						href: "#age",
					},
				]}
			/>
			<Section
				items={[
					{
						key: "row",
						leading: { icon: "File" },
						title: "Write the notes",
						href: "#icon",
					},
				]}
			/>
		</Column>
	),
	globals: { density: "touch" },
	play: async ({ canvas }) => {
		const row = rowOf(canvas, RECONCILE);
		const age = canvas.getByText("8 min");
		const end = age.parentElement;
		const dot = row.querySelector("[role='img']");
		const text = canvas.getByText(RECONCILE).parentElement;
		const glyph = rowOf(canvas, "Write the notes").querySelector(
			"svg.lucide-file",
		);
		if (!end || !dot || !text || !glyph)
			throw new Error("the end group has no box");
		await near(width(end), width(age));
		const slot = slotOf(row, dot);
		await expect(width(slot)).toBeLessThan(
			width(slotOf(rowOf(canvas, "Write the notes"), glyph)),
		);
		const style = getComputedStyle(row);
		const inner =
			row.clientWidth -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight);
		await near(
			width(text),
			inner - width(slot) - width(end) - 2 * columnGap(row),
		);
	},
};

// A leading mark is sized to itself in the row's gap rhythm: its slot is its own
// width and the title stands a gap after it, so the title's x follows the
// mark's width; a row with no leading starts its title where the row's content
// starts.
export const StatusLeadingKeepsOneTitleX: StoryObj = {
	render: () => (
		<Column width={320}>
			<Section
				items={[
					{
						key: "row",
						leading: { status: "active" },
						title: "Plan",
						href: "#plan",
					},
				]}
			/>
			<Section
				items={[
					{
						key: "row",
						leading: { status: "running" },
						title: "Migrate",
						href: "#run",
					},
				]}
			/>
			<Section
				items={[
					{
						key: "row",
						leading: { status: "done" },
						title: "Verify",
						href: "#verify",
					},
				]}
			/>
			<Section
				items={[
					{
						key: "row",
						leading: { icon: "File" },
						title: "Notes",
						href: "#notes",
					},
				]}
			/>
			<Section items={[{ key: "row", title: "Bare", href: "#bare" }]} />
		</Column>
	),
	play: async ({ canvas }) => {
		const titleX = (name: string) => left(canvas.getByText(name));
		let start = 0;
		for (const name of ["Plan", "Migrate", "Verify"]) {
			const row = rowOf(canvas, name);
			const mark = row.querySelector("[role='img']");
			if (!mark) throw new Error(`${name} draws no status mark`);
			const slot = slotOf(row, mark);
			// The slot is the mark's own box, and the title a gap after it.
			await near(width(slot), width(mark), 0.5);
			await near(titleX(name), right(slot) + columnGap(row), 1);
			start = left(slot);
		}
		// No leading: the title starts where the leading would have.
		await near(titleX("Bare"), start, 1);
		await expect(titleX("Notes")).toBeGreaterThan(titleX("Bare") + 1);
	},
};
export const StatusLeadingKeepsOneTitleXTouch = {
	...touch(StatusLeadingKeepsOneTitleX, 320),
	tags: ["touch"],
};

// A row whose whole box is the target needs no square: the hit is the row, at
// the touch floor, and the row draws no chevron. An end item that is a target
// of its own (the more act, a labelled act) keeps the target size.
const TOUCH_TARGET = 44;

const RowTargets: StoryObj = {
	render: () => (
		<Column width={320}>
			<Section items={[{ key: "row", title: "Opens", href: "#opens" }]} />
			<Section
				items={[
					{
						key: "row",
						title: "Menu",
						more: [{ label: "Copy", icon: "Copy", onAct: pressed }],
					},
				]}
			/>
			<Section
				items={[
					{
						key: "row",
						title: "Acts",
						act: { label: "Retry", onAct: pressed },
					},
				]}
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Opens");
		const hit = canvas.getByRole("link", { name: "Opens" });
		// The hit rings inset, inside the row's current bar.
		await near(width(hit), width(row), 6);
		await near(
			hit.getBoundingClientRect().height,
			row.getBoundingClientRect().height,
		);
		await expect(hit.getBoundingClientRect().height).toBeGreaterThanOrEqual(
			TOUCH_TARGET,
		);
		await expect(row.querySelector("svg.lucide-chevron-right")).toBeNull();
		for (const [title, name] of [
			["Menu", "More Menu"],
			["Acts", "Retry"],
		] as const) {
			const target = canvas.getByRole("button", { name });
			await expect(width(target)).toBeGreaterThanOrEqual(TOUCH_TARGET);
			await expect(
				target.getBoundingClientRect().height,
			).toBeGreaterThanOrEqual(TOUCH_TARGET);
			await expect(
				canvas
					.getByText(title)
					.closest(".relative.flex")
					?.querySelector("svg.lucide-chevron-right"),
			).toBeNull();
		}
	},
};
export const RowTargetsAt320 = {
	...touch(RowTargets, 320),
	tags: ["touch"],
};
