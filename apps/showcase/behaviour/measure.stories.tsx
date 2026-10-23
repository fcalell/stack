import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

// Biome reads a `role` prop as an ARIA role on any element, a Text's included.
const META = { role: "meta" } as const;
const SENTENCE =
	"A sentence long enough that three of them run past the measure on any screen, so the paragraph wraps and stands at the column's full width.";
const LONG = `${SENTENCE} ${SENTENCE} ${SENTENCE}`;

export default { title: "Behaviour/Measure" } satisfies Meta;

function Page() {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Rules">
					<Text>{LONG}</Text>
					<Text {...META}>{LONG}</Text>
					<Form
						act={orpc.forms.rename}
						given={{ workspaceId: "acme" }}
						fields={{ name: { label: "Rule", control: "prose" } }}
					/>
				</Pane>
			</Place>
		</div>
	);
}

// The column a page's text stands in: the measure, or the page's width where
// that is less.
function column(root: Element): number {
	const probe = document.createElement("div");
	probe.className = "w-measure px-page";
	root.append(probe);
	const measure = probe.getBoundingClientRect().width;
	const gutter = Number.parseFloat(getComputedStyle(probe).paddingLeft);
	probe.remove();
	return Math.min(measure, root.clientWidth - 2 * gutter);
}

const width = (element: Element | null | undefined) =>
	element?.getBoundingClientRect().width;

// A body Text, a meta Text, a Form and its field box stand as wide as each
// other: one pixel width for every role, not a count of characters of the
// role's own size.
const holdsOneWidth: StoryObj["play"] = async ({ canvas, canvasElement }) => {
	const paragraphs = canvas.getAllByText(/^A sentence long enough/);
	const form = canvasElement.querySelector("form");
	const box = canvas.getByRole("textbox", { name: "Rule" }).parentElement;
	for (const element of [...paragraphs, form, box])
		await expect(width(element)).toBeCloseTo(column(canvasElement), 0);
};

export const TextAndFormShareTheMeasure: StoryObj = {
	render: () => <Page />,
	play: holdsOneWidth,
};

export const TextAndFormShareTheMeasureTouch: StoryObj = {
	render: () => <Page />,
	play: holdsOneWidth,
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
