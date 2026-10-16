import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, type within } from "storybook/test";

// A row is a text group (the title over the meta line) and an end group (the
// trailing value, the status, the chevron, the acts) centred on the row: the
// value and the status never stand on the title's line or the meta line, and a
// row with nothing at its end draws none.
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
const chevronOf = (row: Element) => {
	const mark = row.querySelector("svg.lucide-chevron-right");
	if (!mark) throw new Error("the row draws no chevron");
	return mark;
};

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width = 375): StoryObj {
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

// A value and a chevron end a two-line row on its middle: the value shares the
// chevron's centre, not the title's line.
export const ValueAndChevron: StoryObj = {
	render: () => (
		<Column>
			<ListRow
				title="Sign-in from a second device"
				meta={["implementing", "pass 1"]}
				trailing={{ value: "18 min" }}
				href="#value"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Sign-in from a second device");
		const value = canvas.getByText("18 min");
		const mark = chevronOf(row);
		await near(centre(value), centre(row));
		await near(centre(mark), centre(row));
		await expect(right(value)).toBeLessThanOrEqual(left(mark) + 0.5);
		// Not on the title's line: the title's line ends above the row's middle.
		const title = canvas.getByText("Sign-in from a second device");
		await expect(centre(title)).toBeLessThan(centre(value) - 2);
	},
};
export const ValueAndChevronTouch = touch(ValueAndChevron);

// A status and a chevron end a row the same way.
export const StatusAndChevron: StoryObj = {
	render: () => (
		<Column>
			<ListRow
				title="Rename the flag"
				meta={["Rename the flag to --strict", "round 1"]}
				status={{ state: "waiting", label: "Waiting for you" }}
				href="#status"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Rename the flag");
		const status = canvas.getByText("Waiting for you");
		const mark = chevronOf(row);
		await near(centre(status), centre(row));
		await near(centre(mark), centre(row));
		await expect(right(status)).toBeLessThanOrEqual(left(mark) + 0.5);
		// Not on the meta line: the first part stands under the title, above the
		// status's centre.
		await expect(
			centre(canvas.getByText(/^Rename the flag to/)),
		).toBeGreaterThan(
			centre(canvas.getByText("Rename the flag", { exact: true })),
		);
	},
};
export const StatusAndChevronTouch = touch(StatusAndChevron);

// A status that used to sit alone on the meta line leaves it: the row is one
// line, as high as a row with no status, the status at its end.
export const StatusAloneIsOneLine: StoryObj = {
	render: () => (
		<Column>
			<ListRow title="Plain" href="#plain" />
			<ListRow
				title="Install"
				status={{ state: "done", label: "Ready" }}
				href="#install"
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
		await near(centre(chevronOf(row)), centre(row));
		// The text group holds the title and nothing under it.
		await expect(row.querySelector(".gap-x-inside")).toBeNull();
	},
};
export const StatusAloneIsOneLineTouch = touch(StatusAloneIsOneLine);

// A value and a status stand stacked on purpose (a time over its state): one
// end group, the value over the status, right-aligned, the pair centred on the
// row with the chevron beside it. Built on the recommended reading of the
// owner's open question G1.
export const StackedEndPair: StoryObj = {
	render: () => (
		<Column>
			<ListRow
				title="Deploy api to production"
				meta={["web · fix/checkout", "b71d0e2"]}
				trailing={{ value: "40 min" }}
				status={{ state: "failed", label: "Failed" }}
				href="#pair"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Deploy api to production");
		const value = canvas.getByText("40 min");
		const status = canvas.getByText("Failed");
		const pair = value.parentElement;
		if (!pair) throw new Error("the pair has no box");
		await near(centre(pair), centre(row));
		await expect(centre(value)).toBeLessThan(centre(status));
		await expect(value.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			status.getBoundingClientRect().top + 1,
		);
		await expect(pair.contains(status)).toBe(true);
		await near(right(value), right(pair));
		await near(centre(chevronOf(row)), centre(row));
		await expect(right(pair)).toBeLessThanOrEqual(left(chevronOf(row)) + 0.5);
	},
};
export const StackedEndPairTouch = touch(StackedEndPair);

// A row that holds an entry stands its end value on the row's middle: the
// title and the input keep their lines, the value is not on the first.
export const WholeEntryRow: StoryObj = {
	render: () => (
		<Column>
			<ListRow
				title="Help centre"
				trailing={{ value: "3 min" }}
				entry={{
					label: "Address",
					field: { value: "", onChange: () => {} },
					placeholder: "Enter a full address",
					act: { label: "Import", onAct: () => {} },
				}}
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
export const WholeEntryRowTouch = touch(WholeEntryRow);

// A title that wraps whole keeps its leading on its first line, and the value,
// the status and the chevron stand on the row's middle.
const PASSAGE =
	"Ana asked that every release note names the people whose work shipped, so the changelog reads as a record of the team and never as a list of tickets alone.";

export const WrappedTitle: StoryObj = {
	render: () => (
		<Column width={360}>
			<ListRow
				wrap
				leading={{ icon: "File" }}
				title={PASSAGE}
				trailing={{ value: "2 hr" }}
				href="#wrapped"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, PASSAGE);
		const value = canvas.getByText("2 hr");
		const glyph = row.querySelector("svg.lucide-file");
		if (!glyph) throw new Error("the row draws no leading glyph");
		await near(centre(value), centre(row));
		await near(centre(chevronOf(row)), centre(row));
		// The leading stands on the first line, above the row's middle.
		await expect(centre(glyph)).toBeLessThan(centre(row) - 8);
	},
};
export const WrappedTitleTouch = touch(WrappedTitle);

// A value too long for its row in a 320 px column: the row never overflows, the
// text group keeps two fifths of the row's content width (the Pane head's floor), the value is cut with an
// ellipsis, and the title keeps its floor.
const LONG = "Production · europe-west-1 · 2 hr 14 min";

export const LongValueAt320: StoryObj = {
	render: () => (
		<Column width={320}>
			<ListRow
				title="Checkout redesign"
				meta={["web · fix/checkout"]}
				trailing={{ value: LONG }}
				href="#long"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Checkout redesign");
		const value = canvas.getByText(LONG);
		const group = value.parentElement;
		if (!group) throw new Error("the end group has no box");
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
		await near(centre(chevronOf(row)), centre(row));
	},
};
export const LongValueAt320Touch = touch(LongValueAt320, 320);

// A row with nothing at its end draws no end group and holds no empty box.
export const NothingAtTheEnd: StoryObj = {
	render: () => (
		<Column>
			<ListRow title="Static" meta={["no value, no act"]} />
		</Column>
	),
	play: async ({ canvas }) => {
		const row = canvas.getByText("Static").closest(".relative.flex");
		if (!row) throw new Error("the row has no box");
		await expect(row.children).toHaveLength(1);
		await expect(row.querySelector("[aria-hidden]:empty")).toBeNull();
	},
};
export const NothingAtTheEndTouch = touch(NothingAtTheEnd);

// A row's marks join its end group: a chip under the age (the value over the
// marks, centred), none left on the meta line, and none ever dropped.
export const MarksUnderTheValue: StoryObj = {
	render: () => (
		<Column width={320}>
			<ListRow
				title="Dara Novak"
				meta={["dara.novak@acme.dev · Platform · Deploys"]}
				trailing={{ value: "1 wk" }}
				chip={{ family: "violet", label: "Member" }}
				href="#marks"
			/>
		</Column>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas, "Dara Novak");
		const value = canvas.getByText("1 wk");
		const chip = canvas.getByText("Member");
		const pair = value.parentElement;
		if (!pair) throw new Error("the pair has no box");
		await near(centre(pair), centre(row));
		await expect(value.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			chip.getBoundingClientRect().top + 1,
		);
		await expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
		// Not on the meta line.
		await expect(
			canvas.getByText(/dara.novak@/).parentElement?.contains(chip),
		).toBe(false);
	},
};
export const MarksUnderTheValueTouch = touch(MarksUnderTheValue, 320);

// The text group's floor holds with everything else in the row: a leading
// avatar, the more act, and the value over a chip and a status (a deploys list
// at 320). The group is at least two fifths of the row's content width less the
// row's gap, and the status still draws.
export const TextFloorBesideEverything: StoryObj = {
	render: () => (
		<Column width={320}>
			<ListRow
				leading={{ avatar: { name: "Ana Ruiz" } }}
				title="Cache the build output"
				meta={["a41c9e2", "main"]}
				trailing={{ age: new Date(Date.now() - 2 * 60_000).toISOString() }}
				chip={{ family: "teal", label: "Production" }}
				status={{ state: "running", label: "Building" }}
				more={[{ label: "Copy", icon: "Copy", onAct: () => {} }]}
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
		// The status stands whole; the chip folds away (`ListRowMarksFold`).
		await expect(canvas.getByText("Building")).toBeVisible();
	},
};
export const TextFloorBesideEverythingTouch = touch(
	TextFloorBesideEverything,
	320,
);
