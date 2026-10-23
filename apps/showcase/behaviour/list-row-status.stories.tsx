import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { lineStarts } from "./support.ts";

// A row's status in its end group: its word whole where the group, held to the
// text group's two fifths leave, has the room, its dot alone where it has not,
// and standing at the row's end.
// At the touch density the end group keeps the dot alone whatever the room and
// the word leads the meta line, which wraps. A painted row's height is the
// paint stories'.
export default {
	title: "Behaviour/ListRowStatus",
} satisfies Meta;

type Play = NonNullable<StoryObj["play"]>;

const clipped = (element: HTMLElement) =>
	element.scrollWidth > element.clientWidth;

// The word is kept for a screen reader and drawn at no opacity.
const unseen = (element: HTMLElement) =>
	getComputedStyle(element).opacity === "0";

// The meta line of a row at touch, which the status's word leads: the row's one
// text with the word, the end group drawing the dot alone, so a screen reader
// reads the word once.
const metaOf = (row: HTMLElement, word: string) =>
	within(row).getByText(new RegExp(`^${word}`));

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width = 390): StoryObj {
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

const REMOTE = "/tmp/fx9/remotes/sailwind-service";
const LONG = "Fetched 5 minutes ago";

function Repo(props: { meta?: string[] }) {
	return (
		<Section
			items={[
				{
					key: "sailwind",
					title: "sailwind",
					meta: props.meta ?? [REMOTE, "main"],
					status: { tone: "done", label: LONG },
					href: "#sailwind",
				},
			]}
		/>
	);
}

const WIDTHS = [440, 390, 320];
// The status stays whole in its end group, so its word stands as the dot alone
// where the row is less than the word and the chevron beside it, and the room
// the text keeps.
const NARROW = [440, 320, 220];

function Narrow() {
	return (
		<div className="flex flex-col gap-section">
			{NARROW.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Repo />
				</div>
			))}
		</div>
	);
}

// A status is its word whole where the end group holds it and its dot alone
// where it does not, never the word cut; the row never overflows.
export const StatusWord: StoryObj = {
	render: () => <Narrow />,
	play: async ({ canvas }) => {
		const dotted: boolean[] = [];
		for (const column of canvas.getAllByTestId("column")) {
			const inside = within(column);
			const word = inside.getByText(LONG);
			await expect(clipped(word)).toBe(false);
			dotted.push(unseen(word));
			const row = inside.getByRole("link", { name: "sailwind" }).parentElement;
			if (!row) throw new Error("the row has no box");
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		}
		await expect(dotted.at(-1)).toBe(true);
	},
};

// At touch the end group holds the dot alone, whole whatever the word, and the
// word leads the meta line, which wraps to two lines and is cut only past them.
export const StatusWordTouch = {
	...touch({
		render: () => <Narrow />,
		play: async ({ canvas }) => {
			for (const column of canvas.getAllByTestId("column")) {
				const row = within(column).getByRole("link", {
					name: "sailwind",
				}).parentElement;
				if (!row) throw new Error("the row has no box");
				await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
				await expect(metaOf(row, LONG).textContent?.startsWith(LONG)).toBe(
					true,
				);
			}
		},
	}),
	tags: ["touch"],
};

// The meta takes one line or two as its text needs, and the status stands in
// the end group, so every row's status ends at one x. The remotes run from a few
// letters to a path: some row's meta takes two lines at the narrow widths, none
// takes more, and the status edges agree at every width.
const REMOTES = Array.from(
	{ length: 14 },
	(_, at) => `/tmp/fx9/${"r".repeat(at * 3)}`,
);

function Edges() {
	return (
		<div className="flex flex-col gap-section">
			{WIDTHS.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Section
						items={REMOTES.map((remote) => ({
							key: remote,
							title: remote,
							meta: [remote, "main"],
							status: { tone: "done" as const, label: LONG },
							href: `#${remote}`,
						}))}
					/>
				</div>
			))}
		</div>
	);
}

const linesOf = (element: HTMLElement) =>
	Math.round(
		element.getBoundingClientRect().height /
			Number.parseFloat(getComputedStyle(element).lineHeight),
	);

const edges: Play = async ({ canvas }) => {
	let wrapped = 0;
	for (const column of canvas.getAllByTestId("column")) {
		const ends: number[] = [];
		for (const remote of REMOTES) {
			const row = within(column).getByRole("link", {
				name: remote,
			}).parentElement;
			if (!row) throw new Error("the row has no box");
			const meta = within(row).getByText(`${remote} · main`);
			const lines = linesOf(meta);
			await expect(lines).toBeLessThanOrEqual(2);
			if (lines === 2) wrapped += 1;
			ends.push(within(row).getByText(LONG).getBoundingClientRect().right);
		}
		for (const end of ends)
			await expect(Math.abs(end - (ends[0] ?? end))).toBeLessThanOrEqual(1);
	}
	await expect(wrapped).toBeGreaterThan(0);
};

export const StatusEnds: StoryObj = {
	render: () => <Edges />,
	play: edges,
};
// The word leads every row's meta line, which wraps to two lines at the most and
// never starts a line on a dot.
export const StatusEndsTouch = {
	...touch({
		render: () => <Edges />,
		play: async ({ canvas }) => {
			let wrapped = 0;
			for (const column of canvas.getAllByTestId("column")) {
				for (const remote of REMOTES) {
					const row = within(column).getByRole("link", {
						name: remote,
					}).parentElement;
					if (!row) throw new Error("the row has no box");
					const lines = linesOf(metaOf(row, LONG));
					await expect(lines).toBeLessThanOrEqual(2);
					if (lines === 2) wrapped += 1;
				}
			}
			await expect(wrapped).toBeGreaterThan(0);
		},
	}),
	tags: ["touch"],
};

const PAUSED = "Watches paused for usage · resumes 8:09 PM";
const WHO = "Who you are, your sign-in and your devices";

// At 320 a status as long as a sentence stands whole: its word leads the meta
// line (wrapping with it, no line starting on a dot) and the end group holds the
// dot alone, so nothing in it is cut.
export const StatusLeadsTheMeta = {
	...touch(
		{
			render: () => (
				<div data-testid="column" style={{ width: 320 }} className="max-w-full">
					<Section
						items={[
							{
								key: "watches",
								title: "Watches",
								meta: [WHO],
								status: { tone: "attention", label: PAUSED },
								href: "#watches",
							},
						]}
					/>
				</div>
			),
			play: async ({ canvas }) => {
				const row = canvas.getByRole("link", { name: "Watches" }).parentElement;
				if (!row) throw new Error("the row has no box");
				const [, text, end] = [...row.children];
				const meta = text?.lastElementChild;
				if (!meta || !end) throw new Error("the row lacks its meta or its end");
				// The word leads the meta, and the row's text carries it whole.
				await expect(meta.textContent?.replaceAll(" ", " ")).toBe(
					`${PAUSED} · ${WHO}`,
				);
				// The end group is the dot alone, no word in it, nothing in it cut.
				await expect(end.textContent).toBe("");
				await expect(end.scrollWidth).toBeLessThanOrEqual(end.clientWidth);
				await expect(
					end.querySelector("[class*='rounded-full']"),
				).not.toBeNull();
				await expect(lineStarts(meta)).not.toContain("·");
				await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
			},
		},
		320,
	),
	tags: ["touch"],
};

const STALE = "3 may be out of date";

// A row in a narrow Pane (a System index beside two more Panes), its icon
// leading and its meta a sentence: the text group keeps its two fifths, so the
// title is never broken by the letter, and a status whose word does not fit in
// the rest stands as its dot alone.
export const StatusYieldsInANarrowPane: StoryObj = {
	render: () => (
		<div data-testid="column" style={{ width: 220 }} className="max-w-full">
			<Section
				items={[
					{
						key: "knowledge",
						leading: { icon: "BookOpen" },
						title: "Knowledge",
						meta: ["What Code reads about a repo.", "150"],
						status: { tone: "attention", label: STALE },
						href: "#knowledge",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const link = canvas.getByRole("link", { name: "Knowledge" });
		const row = link.parentElement;
		if (!row) throw new Error("the row has no box");
		const title = canvas.getByText("Knowledge");
		await expect(title.getBoundingClientRect().height).toBeLessThanOrEqual(
			Number.parseFloat(getComputedStyle(title).lineHeight) * 1.5,
		);
		await expect(unseen(canvas.getByText(STALE))).toBe(true);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
	},
};
