import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Rules } from "@fcalell/plugin-react-ui/components/rules";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// Every pointer target is at least 24 px each way (WCAG 2.5.8), 44 on touch,
// measured as the element's own rect: a hit layer drawn past the element does
// not count, so the element is the target.
export default {
	title: "Behaviour/TargetSize",
} satisfies Meta;

const TARGETS =
	"button, a[href], [role=button], [role=switch], [role=combobox], input, select, textarea";

// A control the viewer can reach: drawn, and not inside a hidden or inert
// subtree (a popup's focus guards).
function targets(root: HTMLElement) {
	return [...root.querySelectorAll<HTMLElement>(TARGETS)].filter(
		(element) =>
			element.getClientRects().length > 0 &&
			!element.closest("[aria-hidden=true], [data-base-ui-inert]"),
	);
}

const small = (root: HTMLElement, floor: number) =>
	targets(root)
		.map((element) => ({ element, box: element.getBoundingClientRect() }))
		.filter(
			({ box }) =>
				Math.round(box.width) < floor || Math.round(box.height) < floor,
		)
		.map(
			({ element, box }) =>
				`${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24) ?? element.tagName} ${Math.round(box.width)}x${Math.round(box.height)}`,
		);

const options = [
	{ value: "page.type", label: "Page type" },
	{ value: "order.total", label: "Order total" },
];
const variables = [
	{ value: "pageType", label: "pageType" },
	{ value: "value", label: "value" },
];

function Mapping() {
	return (
		<div className="w-120 max-w-full">
			<Rules
				rules={[
					{
						id: "a",
						terms: {
							from: {
								either: {
									label: "Source",
									options,
									value: { picked: "page.type" },
									onChange: () => {},
									placeholder: "A constant",
								},
							},
							to: {
								pick: {
									label: "Argument",
									options: variables,
									value: "pageType",
									onChange: () => {},
								},
							},
						},
						onRemove: () => {},
					},
					{
						id: "b",
						terms: {
							from: {
								either: {
									label: "Source",
									options,
									value: { typed: "EUR" },
									onChange: () => {},
									placeholder: "A constant",
								},
							},
							to: {
								either: {
									label: "Argument",
									options: [],
									value: { typed: "currency" },
									onChange: () => {},
								},
							},
						},
						onRemove: () => {},
					},
				]}
				add={{ label: "Add an argument", onAct: () => {} }}
			/>
		</div>
	);
}

function Definitions() {
	return (
		<div className="w-pane max-w-full">
			<DefinitionRow label="Account" value="Ada" href="#account" />
			<DefinitionRow
				label="Keys"
				value="2"
				description="Used to sign in"
				onOpen={() => {}}
			/>
		</div>
	);
}

// The density the preview pinned: 44 on touch, 24 under a pointer.
function Chips() {
	return (
		<div className="w-120 max-w-full">
			<Chip family="neutral" label="Checkout" onRemove={() => {}} />
			<Picker
				label="Values"
				options={options}
				value={["page.type", "order.total"]}
				onChange={() => {}}
			/>
		</div>
	);
}

const floor = () =>
	document.documentElement.dataset.density === "touch" ? 44 : 24;

// The mapping row: its remove acts, its picks and its typed value.
export const MappingRow: StoryObj = {
	render: () => <Mapping />,
	play: async ({ canvasElement }) => {
		await expect(small(canvasElement, floor())).toEqual([]);
	},
};

// Where a text's glyphs start, not its box.
const textLeft = (root: HTMLElement, text: string) => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (node.textContent !== text) continue;
		const range = document.createRange();
		range.selectNodeContents(node);
		return range.getBoundingClientRect().left;
	}
	throw new Error(`no text "${text}"`);
};

// A definition row that opens: the label that is its link is the target, and
// a button's label starts where its description does.
export const OpeningRow: StoryObj = {
	render: () => <Definitions />,
	play: async ({ canvasElement }) => {
		await expect(small(canvasElement, floor())).toEqual([]);
		await expect(textLeft(canvasElement, "Keys")).toBeCloseTo(
			textLeft(canvasElement, "Used to sign in"),
			0,
		);
	},
};

// A chip's remove act, alone and inside a pick of several.
export const ChipRemove: StoryObj = {
	render: () => <Chips />,
	play: async ({ canvasElement }) => {
		await expect(small(canvasElement, floor())).toEqual([]);
	},
};

const touch = (story: StoryObj): StoryObj => ({
	...story,
	tags: ["touch"],
	globals: { density: "touch", viewport: { value: "phone", isRotated: false } },
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
});
export const MappingRowTouch = touch(MappingRow);
export const OpeningRowTouch = touch(OpeningRow);
export const ChipRemoveTouch = touch(ChipRemove);
