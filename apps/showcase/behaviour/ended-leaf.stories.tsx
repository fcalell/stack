import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, spyOn, waitFor } from "storybook/test";

// A leaf draws its paint only while its read waits. Once the read ended
// (failed or missing) it draws its loaded-empty form, no line for a text, and
// the frame that holds the read says why, once. The shapes: an ask box (a
// Section's description over a read a Thread inside it holds), the Doctor (a
// Section's description over the Section's own read) and a failed Pane. Each
// is drawn at 320, 1280 and 1920 px, in the light and the dark.
export default { title: "Behaviour/Ended leaves" } satisfies Meta;

const toRow = (name: string): Row => ({ key: name, title: name });
const rows = (items: Selection<readonly string[]>) =>
	items.at((names) => names.map(toRow));
const MESSAGE = {
	key: (name: string) => name,
	author: () => "other" as const,
	body: (name: string) => name,
};
const WIDTHS = [320, 1280, 1920];

type Reads = ReturnType<typeof readsAt>;

const UNHELD = /no frame holds it/;
let logged: ReturnType<typeof spyOn>;
const watch = () => {
	logged = spyOn(console, "error");
	return () => logged.mockRestore();
};

function Widths(props: { draw: (width: number) => ReactNode }) {
	return (
		<div className="flex flex-col gap-section">
			{WIDTHS.map((width) => (
				<div
					key={width}
					data-testid={`w${width}`}
					style={{ width }}
					className="shrink-0"
				>
					{props.draw(width)}
				</div>
			))}
		</div>
	);
}

const ask = (r: Reads) => (
	<Section
		title="Ask"
		description={r.failing.at((rows) => `${rows.length} messages`)}
	>
		<Thread items={r.failing} message={MESSAGE} />
	</Section>
);

const doctor = (r: Reads) => (
	<Section
		title="Doctor"
		items={rows(r.failing)}
		description={r.failing.at((names) => names.join(", "))}
	/>
);

const pane = (r: Reads) => (
	<div className="h-[24rem]">
		<Place>
			<Pane title="Record" read={r.failing}>
				<Section
					title="Checks"
					description={r.failing.at((names) => names.join(", "))}
					items={rows(r.ready)}
				/>
			</Pane>
		</Place>
	</div>
);

// The frame's failed form stands once, with no grey painted bar beside it,
// and nothing logs an unheld read.
const failedOnce = async (canvas: {
	getByTestId: (id: string) => HTMLElement;
}) => {
	for (const width of WIDTHS) {
		const box = canvas.getByTestId(`w${width}`);
		await waitFor(() =>
			expect(box.textContent?.split("This didn't load.").length).toBe(2),
		);
		await expect(box.querySelector("[data-painted]")).toBeNull();
		await expect(box.textContent).not.toContain("messages");
	}
	await expect(
		logged.mock.calls.filter(
			(args: unknown[]) => typeof args[0] === "string" && UNHELD.test(args[0]),
		),
	).toHaveLength(0);
};

const shape = (
	key: string,
	draw: (r: Reads) => ReactNode,
	mode: "light" | "dark",
): StoryObj => ({
	beforeEach: watch,
	parameters: { mode },
	render: () => (
		<Widths draw={(width) => draw(readsAt(`ended/${key}/${mode}/${width}`))} />
	),
	play: async ({ canvas }) => failedOnce(canvas),
});

export const AskBoxDescriptionOverFailedThreadLight = shape(
	"ask",
	ask,
	"light",
);
export const AskBoxDescriptionOverFailedThreadDark = shape("ask", ask, "dark");
export const DoctorDescriptionOverItsOwnFailedReadLight = shape(
	"doctor",
	doctor,
	"light",
);
export const DoctorDescriptionOverItsOwnFailedReadDark = shape(
	"doctor",
	doctor,
	"dark",
);
export const FailedPaneDrawsTheFailureOnceLight = shape("pane", pane, "light");
export const FailedPaneDrawsTheFailureOnceDark = shape("pane", pane, "dark");

// A failed Pane keeps its title for now.
export const FailedPaneKeepsItsTitle: StoryObj = {
	render: () => pane(readsAt("ended/pane-title")),
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		await expect(canvas.getByRole("heading", { name: "Record" })).toBeVisible();
	},
};

// Waiting still paints: the description stands as filler until the read lands.
const waiting = readsAt("ended/waiting");
export const WaitingDescriptionStillPaints: StoryObj = {
	render: () => (
		<Section
			title="Doctor"
			items={rows(waiting.waiting)}
			description={waiting.waiting.at((names) => names.join(", "))}
		/>
	),
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(
				canvasElement.querySelector("section [data-painted]"),
			).not.toBeNull(),
		);
	},
};
