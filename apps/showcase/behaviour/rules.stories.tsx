import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Rules } from "@fcalell/plugin-react-ui/components/rules";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Option, Rule } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

const pressed = fn();

// A condition rule is one row of a field, an operator and a value: a pick of
// several holds its values on that one line however many there are, its list
// stays open while the viewer picks and opens against its trigger each time,
// and a long list of fields leads with a search.
export default {
	title: "Behaviour/Rules",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

type Story = StoryObj;

const FIELDS: Option[] = Array.from({ length: 23 }, (_, at) => ({
	value: at === 0 ? "project" : `field.${at}`,
	label: at === 0 ? "Project" : `Field number ${at}`,
}));
const PROJECTS: Option[] = [
	"Outfitters web",
	"Outfitters outlet",
	"Outfitters app",
	"Outfitters kiosk",
	"Outfitters pop-up",
	"Outfitters wholesale",
	"Outfitters archive",
].map((label) => ({ value: label, label }));

function Conditions(props: { initial: string[] }) {
	const [picked, setPicked] = useState(props.initial);
	const [field, setField] = useState("project");
	const rules: Rule[] = [
		{
			id: "c0",
			onRemove: () => {},
			terms: {
				field: {
					label: "Condition field",
					options: FIELDS,
					value: field,
					onChange: setField,
				},
				operator: "in",
				value: {
					picks: {
						label: "Projects",
						options: PROJECTS,
						value: picked,
						onChange: setPicked,
					},
				},
			},
		},
	];
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Mapping">
					<Section title="Conditions">
						<Rules
							rules={rules}
							add={{ label: "Add condition", onAct: pressed }}
						/>
					</Section>
				</Pane>
			</Place>
		</div>
	);
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));
async function frames(count = 4) {
	for (let at = 0; at < count; at++) await frame();
}

// The rule's row: the list item holding the remove act.
function rowOf(root: HTMLElement): HTMLElement {
	const remove = root.querySelector("[data-rule-remove]");
	const row = remove?.closest<HTMLElement>("li, [role='listitem']");
	if (!row) throw new Error("the rule did not draw");
	return row;
}

export const TwoValuesStayOnTheRulesLine: Story = {
	render: () => (
		<Conditions initial={["Outfitters web", "Outfitters outlet"]} />
	),
	play: async ({ canvasElement, canvas }) => {
		await canvas.findByRole("combobox", { name: "Projects" });
		await frames();
		const row = rowOf(canvasElement);
		const none = row.getBoundingClientRect().height;
		const control = row
			.querySelector("button[role='combobox'][aria-label='Condition field']")
			?.getBoundingClientRect().height;
		await expect(none).toBeLessThanOrEqual((control ?? 0) + 4);
	},
};

export const FiveValuesStayOnTheRulesLine: Story = {
	render: () => (
		<Conditions
			initial={PROJECTS.slice(0, 5).map((each) => each.value as string)}
		/>
	),
	play: async ({ canvasElement, canvas }) => {
		await canvas.findByRole("combobox", { name: "Projects" });
		await frames();
		const row = rowOf(canvasElement);
		const control = row
			.querySelector("button[role='combobox'][aria-label='Condition field']")
			?.getBoundingClientRect().height;
		await expect(row.getBoundingClientRect().height).toBeLessThanOrEqual(
			(control ?? 0) + 4,
		);
		// The values are not lost: the picker holds every one of them.
		await expect(canvasElement.textContent).toContain("5");
	},
};

// Several values fold into one token naming how many, its noun the field's
// label lowercased ("5 projects", never "5 Projects"): a first word that holds
// another capital (an acronym) passes through whole.
export const TheFoldedTokenNamesItsNounInLowercase: Story = {
	render: () => (
		<Conditions
			initial={PROJECTS.slice(0, 5).map((each) => each.value as string)}
		/>
	),
	play: async ({ canvasElement, canvas }) => {
		await canvas.findByRole("combobox", { name: "Projects" });
		await frames();
		await expect(canvasElement.textContent).toContain("5 projects");
		await expect(canvasElement.textContent).not.toContain("5 Projects");
	},
};

// Where the open list stands against the box it opened from (the field box that
// holds the trigger), and whether it stays inside the rule's row.
function standing(list: HTMLElement, trigger: HTMLElement, row: HTMLElement) {
	const popup = list.closest<HTMLElement>("[role='dialog']") ?? list;
	const box = trigger.parentElement as HTMLElement;
	const [at, from, within] = [popup, box, row].map((element) =>
		element.getBoundingClientRect(),
	) as [DOMRect, DOMRect, DOMRect];
	return {
		left: Math.round(at.left - from.left),
		wider: at.width >= from.width - 1,
		inside: at.right <= within.right + 1,
	};
}

export const AReopenedValueListOpensAtItsBox: Story = {
	render: () => <Conditions initial={["Outfitters web"]} />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const trigger = () => canvas.getByRole("combobox", { name: "Projects" });
		const open = async () => {
			await userEvent.click(trigger());
			const list = await screen.findByRole("listbox");
			await frames(8);
			return standing(list, trigger(), rowOf(canvasElement));
		};
		const first = await open();
		await userEvent.click(
			await screen.findByRole("option", { name: "Outfitters outlet" }),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await frames(8);
		const again = await open();
		const stands = { left: 0, wider: true, inside: true };
		await expect(first).toEqual(stands);
		await expect(again).toEqual(stands);
	},
};

export const ThePickOfSeveralStaysOpenWhilePicking: Story = {
	render: () => <Conditions initial={[]} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: "Projects" }));
		await userEvent.click(
			await screen.findByRole("option", { name: "Outfitters web" }),
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "Outfitters outlet" }),
		);
		await frames();
		await expect(screen.getByRole("listbox")).toBeInTheDocument();
		await expect(screen.getAllByRole("option", { selected: true }).length).toBe(
			2,
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		// An outside press closes it too.
		await userEvent.click(canvas.getByRole("combobox", { name: "Projects" }));
		await screen.findByRole("listbox");
		await userEvent.click(document.body);
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
	},
};

export const APickOfOneClosesOnThePick: Story = {
	render: () => <Conditions initial={[]} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("combobox", { name: "Condition field" }),
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "Field number 3" }),
		);
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
	},
};

export const ALongFieldListLeadsWithASearch: Story = {
	render: () => <Conditions initial={["Outfitters web"]} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("combobox", { name: "Condition field" }),
		);
		const list = await screen.findByRole("listbox");
		const search = screen.getByRole("combobox", { name: "Search" });
		// The search is the first row, above the options.
		await expect(
			search.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await userEvent.keyboard("zzz");
		await screen.findByText("No matches");
	},
};

// The rule's card on a phone stacks its terms: the field, the operator, the
// value and the remove act. The value is one control line however many values
// it holds, so the card is no taller for them.
function terms(canvasElement: HTMLElement) {
	const row = rowOf(canvasElement);
	const [field, , value] = [...row.children].map(
		(child) => child.getBoundingClientRect().height,
	) as [number, number, number];
	return { field: Math.round(field), value: Math.round(value) };
}

function phone(story: Story): Story {
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
						styles: { width: "390px", height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

const holdsOneLine: Story["play"] = async ({ canvasElement, canvas }) => {
	await canvas.findByRole("button", { name: "Projects" });
	await frames();
	const { field, value } = terms(canvasElement);
	await expect(value).toBe(field);
};

export const TwoValuesStayOneControlOnAPhone: Story = {
	...phone({
		render: () => (
			<Conditions initial={["Outfitters web", "Outfitters outlet"]} />
		),
		play: holdsOneLine,
	}),
	tags: ["touch"],
};

export const FourValuesStayOneControlOnAPhone: Story = {
	...phone({
		render: () => (
			<Conditions
				initial={PROJECTS.slice(0, 4).map((each) => each.value as string)}
			/>
		),
		play: holdsOneLine,
	}),
	tags: ["touch"],
};

// On a phone the remove act stands beside the value (a pair's target), on the
// value's own line, not alone on a row under it: the card is its field, its
// operator and its value's line, a gap apart inside the card's padding.
export const TheRemoveStandsBesideTheValueOnAPhone: Story = {
	...phone({
		render: () => <Conditions initial={["Outfitters web"]} />,
		play: async ({ canvasElement, canvas }) => {
			await canvas.findByRole("button", { name: "Projects" });
			await frames();
			const card = rowOf(canvasElement);
			const style = getComputedStyle(card);
			const lines = [...card.children].map(
				(child) => child.getBoundingClientRect().height,
			);
			await expect(lines.length).toBe(3);
			const stacked =
				lines.reduce((sum, height) => sum + height, 0) +
				Number.parseFloat(style.rowGap) * (lines.length - 1) +
				Number.parseFloat(style.paddingTop) +
				Number.parseFloat(style.paddingBottom);
			await expect(
				Math.abs(card.getBoundingClientRect().height - stacked),
			).toBeLessThan(1);
			const value = (
				canvas.getByRole("button", { name: "Projects" })
					.parentElement as HTMLElement
			).getBoundingClientRect();
			const remove = canvasElement
				.querySelector("[data-rule-remove] button")
				?.getBoundingClientRect() as DOMRect;
			await expect(remove.left).toBeGreaterThanOrEqual(value.right - 1);
			await expect(
				Math.abs(
					remove.top + remove.height / 2 - (value.top + value.height / 2),
				),
			).toBeLessThan(1);
		},
	}),
	tags: ["touch"],
};
