import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// A definition row at the pane's 320 px width, at the desktop density and, in
// a 375 px phone, the touch one: a value of words is one text run, the values
// of a Group end at one x whatever stands at the row's end, and a label wraps
// beside a control.
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
			<Group>
				<DefinitionRow label="Expected spend" value="No history yet" />
				<DefinitionRow label="Disk" value="7.4 GB left" />
				<DefinitionRow label="Signed on" value="This machine" />
				<DefinitionRow label="Held" value="No" />
				<DefinitionRow label="Note" value={LONG} />
				<DefinitionRow label="Key" value={ID} />
			</Group>
		</Pane>
	),
	play: words,
};

// Every value ends at the line's end of its row, whatever the row's end holds,
// and a two-line row's value stands on the label's line with its act centred
// on the row.
const ends: Play = async ({ canvas }) => {
	const stems = ["Plain", "Linked", "Acted", "Copied"].map((name) =>
		canvas.getByText(`${name} value`),
	);
	const first = box(stems[0] as HTMLElement).right;
	for (const stem of stems) {
		await expect(Math.abs(box(stem).right - first)).toBeLessThan(0.5);
	}
	const label = canvas.getByText("Described");
	const row = rowOf(label);
	const value = canvas.getByText("Described value");
	await expect(Math.abs(middle(value) - middle(label))).toBeLessThan(1);
	await expect(
		Math.abs(
			middle(canvas.getByRole("button", { name: "Rename" })) - middle(row),
		),
	).toBeLessThan(1);
	await expect(Math.abs(box(value).right - first)).toBeLessThan(0.5);
};

export const ValuesEndTogether: StoryObj = {
	render: () => (
		<Pane>
			<Group>
				<DefinitionRow label="Plain" value="Plain value" />
				<DefinitionRow label="Linked" value="Linked value" href="#linked" />
				<DefinitionRow
					label="Acted"
					value="Acted value"
					act={{ icon: "Pencil", label: "Edit", onAct: change }}
				/>
				<DefinitionRow label="Copied" value="Copied value" copyable />
				<DefinitionRow
					label="Described"
					description="A sentence under the label and the value."
					value="Described value"
					act={{ icon: "Pencil", label: "Rename", onAct: change }}
				/>
			</Group>
		</Pane>
	),
	play: ends,
};

// A sentence label wraps beside a switch that stays whole at the row's end and
// centred on the label; a short label keeps the height of any one-line row.
const wraps: Play = async ({ canvas }) => {
	const label = canvas.getByText(LABEL);
	const row = rowOf(label);
	const toggle = canvas.getByRole("switch", { name: "Only changes" });
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
			<Group>
				<DefinitionRow
					label={LABEL}
					value={<Switch checked onChange={change} label="Only changes" />}
				/>
				<DefinitionRow
					label="Short"
					value={<Switch checked onChange={change} label="Short" />}
				/>
				<DefinitionRow label="Plain" value="Value" />
				<DefinitionRow label="Last" value="Value" />
			</Group>
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

export const ValueWordsTouch = touch(ValueWords);
export const ValuesEndTogetherTouch = touch(ValuesEndTogether);
export const LabelWrapsTouch = touch(LabelWraps);
