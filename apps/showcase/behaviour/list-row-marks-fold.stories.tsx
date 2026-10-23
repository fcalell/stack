import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";

const pressed = fn();

// A row's marks (status, warning, lock, chip) stand whole in its end group or
// fold away, the last first: the text group keeps two fifths of the row, the
// first mark always stands, and none is ever cut to an ellipsis. A folded mark
// is not drawn, and stays in the row's content for a screen reader.
export default {
	title: "Behaviour/ListRowMarksFold",
} satisfies Meta;

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width: number): StoryObj {
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

// A deploys list's row: the age over a status and a chip, a leading avatar and
// the more act beside them.
function Deploy(props: { width: number }) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						leading: { avatar: { name: "Ana Ruiz" } },
						title: "Cache the build output",
						meta: ["a41c9e2", "main"],
						trailing: { age: new Date(Date.now() - 2 * 60_000).toISOString() },
						status: { tone: "active", label: "Building" },
						chip: { family: "teal", label: "Production" },
						more: [{ label: "Copy", icon: "Copy", onAct: pressed }],
					},
				]}
			/>
		</div>
	);
}

// Whole: the text is not cut, whatever its box says of it.
const whole = (element: HTMLElement) =>
	expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);

// At 320 the status stands whole and the chip folds; the title keeps its two
// fifths of the row.
export const FoldsTheChipAt320: StoryObj = {
	render: () => <Deploy width={320} />,
	play: async ({ canvas }) => {
		const status = canvas.getByText("Building");
		await expect(status).toBeVisible();
		await whole(status);
		const chip = canvas.getByText("Production");
		await expect(chip).not.toBeVisible();
		// Not drawn, but still the row's content.
		await expect(chip).toBeInTheDocument();
		const text = canvas.getByText("Cache the build output").parentElement;
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
	},
};

// At 1280 both marks stand, the chip before the status (the order of the end
// group: the marks, then the status).
export const BothMarksAt1280: StoryObj = {
	render: () => <Deploy width={1280} />,
	play: async ({ canvas }) => {
		const status = canvas.getByText("Building");
		const chip = canvas.getByText("Production");
		await expect(status).toBeVisible();
		await expect(chip).toBeVisible();
		await whole(status);
		await whole(chip);
		await expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(
			status.getBoundingClientRect().left,
		);
	},
};

// The marks return as the row widens, one at a time, the first never leaving.
export const MarksReturnAsTheRowWidens: StoryObj = {
	render: () => <Deploy width={320} />,
	play: async ({ canvas, canvasElement }) => {
		const box = canvasElement.querySelector<HTMLElement>("div[style]");
		if (!box) throw new Error("the row has no box");
		const chip = canvas.getByText("Production");
		await expect(chip).not.toBeVisible();
		box.style.width = "640px";
		await waitFor(() => expect(chip).toBeVisible());
		await expect(canvas.getByText("Building")).toBeVisible();
		box.style.width = "320px";
		await waitFor(() => expect(chip).not.toBeVisible());
		await expect(canvas.getByText("Building")).toBeVisible();
	},
};

// A press on a passive mark opens the row: the hit under the end group gets
// it, since the marks are click-through.
const hitAtCentre = async (mark: HTMLElement) => {
	const at = mark.getBoundingClientRect();
	const found = document.elementFromPoint(
		at.left + at.width / 2,
		at.top + at.height / 2,
	);
	const hit = found?.closest("[data-hit]");
	if (!hit) throw new Error("a press on the mark does not reach the hit");
	await expect(hit.tagName).toBe("A");
};

export const AStatusLetsAPressThrough: StoryObj = {
	render: () => (
		<div style={{ width: 320 }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Cache the build output",
						href: "/deploys/1",
						status: { tone: "active", label: "Building" },
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => hitAtCentre(canvas.getByText("Building")),
};
export const AStatusLetsAPressThroughTouch = {
	...touch(AStatusLetsAPressThrough, 320),
	tags: ["touch"],
};

export const MarksBesideAValueLetAPressThrough: StoryObj = {
	render: () => (
		<div style={{ width: 320 }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Cache the build output",
						href: "/deploys/1",
						trailing: { age: new Date(Date.now() - 2 * 60_000).toISOString() },
						status: { tone: "active", label: "Building" },
						chip: { family: "teal", label: "Production" },
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => hitAtCentre(canvas.getByText("Building")),
};
export const MarksBesideAValueLetAPressThroughTouch = {
	...touch(MarksBesideAValueLetAPressThrough, 320),
	tags: ["touch"],
};

// Beside a pick the text group has no floor of its own, but the marks fold
// before the title is left no room: a member's row at 320 holds its title and
// meta at a readable width and draws the pick and the more act, the chip
// folded away.
export const FoldsTheChipBesideAPickAt320: StoryObj = {
	render: () => (
		<div style={{ width: 320 }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						leading: { avatar: { name: "Casey Consultant" } },
						title: "Casey Consultant",
						meta: ["Expires Dec 2", "consultant@fixture.test"],
						chip: { family: "neutral", label: "External" },
						pick: {
							label: "Role",
							options: [
								{ value: "editor", label: "Editor" },
								{ value: "viewer", label: "Viewer" },
							],
							value: "editor",
							onChange: () => {},
						},
						more: [{ label: "Remove", icon: "UserMinus", onAct: pressed }],
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		await document.fonts.ready;
		const chip = canvas.getByText("External");
		await waitFor(() => expect(chip).not.toBeVisible());
		const text = canvas.getByText("Casey Consultant").parentElement;
		if (!text) throw new Error("the row has no text group");
		await expect(text.getBoundingClientRect().width).toBeGreaterThan(100);
		await expect(canvas.getByLabelText("Role, Editor")).toBeVisible();
	},
};
export const FoldsTheChipBesideAPickAt320Touch = {
	...touch(FoldsTheChipBesideAPickAt320, 320),
	tags: ["touch"],
};

// Whether an element is drawn: not at no opacity, itself or in a folded slot.
const drawn = (element: HTMLElement) =>
	element.checkVisibility({ opacityProperty: true });

// A row's widths, narrow to wide, one column each.
const SWEEP = Array.from({ length: 23 }, (_, at) => 280 + at * 20);

function Sweep(props: { mark: object; title: string; meta?: boolean }) {
	return (
		<div className="flex flex-col gap-section">
			{SWEEP.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Section
						items={[
							{
								key: "row",
								leading: { icon: "GitBranch" },
								title: props.title,
								meta:
									props.meta === false
										? undefined
										: ["Visit", { code: "login" }],
								href: `#${props.title}`,
								...props.mark,
							},
						]}
					/>
				</div>
			))}
		</div>
	);
}

// The last mark folds first: a warning is cut only once the chip after it has
// folded, never while the chip stands.
export const TheChipFoldsBeforeTheWarningIsCut: StoryObj = {
	render: () => (
		<Sweep
			title="Sign in"
			mark={{
				warning: "Not in this change set",
				chip: { family: "neutral", label: "account" },
			}}
		/>
	),
	play: async ({ canvas }) => {
		await document.fonts.ready;
		const chips = canvas.getAllByText("account");
		// The rows have measured once the narrowest has folded its chip.
		const [first] = chips;
		if (!first) throw new Error("the chip is not drawn");
		await waitFor(() => expect(drawn(first)).toBe(false));
		let stood = 0;
		let folded = 0;
		for (const column of canvas.getAllByTestId("column")) {
			const inside = within(column);
			const warning = inside.getByText("Not in this change set");
			const chip = inside.getByText("account");
			if (!drawn(chip)) folded += 1;
			else {
				stood += 1;
				await whole(warning);
				await whole(chip);
			}
		}
		// Both forms are drawn somewhere in the sweep.
		await expect(stood).toBeGreaterThan(0);
		await expect(folded).toBeGreaterThan(0);
	},
};
export const TheChipFoldsBeforeTheWarningIsCutTouch = {
	...touch(TheChipFoldsBeforeTheWarningIsCut, SWEEP.at(-1) ?? 720),
	tags: ["touch"],
};

const WORD = "Failing to deploy to prod";

// A status stands as its word whole or as its dot alone, never the word cut to
// a letter; the word stays in the row's content as the status's name. A row
// keeps its text group's two fifths in every form, the compact one and touch
// included, so its word gives way to its dot where the marks' room is short and
// the name is never broken to make room for the word.

export const AStatusWordFitsOrFallsBackToItsDot: StoryObj = {
	render: () => (
		<Sweep
			title="Sign in"
			meta={false}
			mark={{ status: { tone: "failed", label: WORD } }}
		/>
	),
	play: async ({ canvas }) => {
		await document.fonts.ready;
		const words = canvas.getAllByText(WORD);
		// The rows have measured once the widest stands whole.
		await waitFor(() => expect(drawn(words.at(-1) as HTMLElement)).toBe(true));
		let worded = 0;
		let dotted = 0;
		for (const column of canvas.getAllByTestId("column")) {
			const word = within(column).getByText(WORD);
			await expect(word).toBeInTheDocument();
			const mark = word.parentElement;
			if (!mark) throw new Error("the status has no box");
			await expect(mark.getBoundingClientRect().width).toBeGreaterThan(0);
			if (!drawn(word)) {
				dotted += 1;
				// The dot alone: nothing else of the status takes room.
				await expect(mark.getBoundingClientRect().width).toBeLessThan(
					word.scrollWidth / 2,
				);
			} else {
				worded += 1;
				await whole(word);
			}
		}
		await expect(worded).toBeGreaterThan(0);
		await expect(dotted).toBeGreaterThan(0);
	},
};
// On touch the row is the compact form at every width, and the rule holds the
// same: the word whole where the end group has the room beside the name's two
// fifths, its dot alone where it has not.
export const AStatusWordFitsOrFallsBackToItsDotTouch = {
	...touch(AStatusWordFitsOrFallsBackToItsDot, SWEEP.at(-1) ?? 720),
	tags: ["touch"],
};

// A warning is a sentence, not a pill word: first among the marks of a narrow
// list's row (219 px, the third Pane of a Place) its label truncates, down to
// its glyph, so the row never exceeds its sheet, and its meta line stays in it.
export const AWarningYieldsInANarrowPane: StoryObj = {
	render: () => (
		<div style={{ width: 219 }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Scout",
						wrap: true,
						meta: ["Claude", "No helpers", "1 step", "shipped"],
						href: "/agents/scout",
						warning: "Its boundary names a verb the lead no longer holds",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement }) => {
		const label = canvas.getByText(
			"Its boundary names a verb the lead no longer holds",
		);
		const row = canvasElement.querySelector("[data-hit]")?.parentElement;
		if (!row) throw new Error("the row has no box");
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		await expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(
			row.getBoundingClientRect().right,
		);
	},
};
