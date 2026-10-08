import { List } from "@fcalell/plugin-react-ui/components/list";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import type { RowStatus } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

// A row's status on its meta line: waiting for its own read at the loaded
// row's height (so nothing under it moves when it answers), and said shorter
// when the long words would be cut.
export default {
	title: "Behaviour/ListRowStatus",
} satisfies Meta;

type Play = NonNullable<StoryObj["play"]>;

const top = (element: Element) => element.getBoundingClientRect().top;
const height = (element: Element) => element.getBoundingClientRect().height;
const clipped = (element: HTMLElement) =>
	element.scrollWidth > element.clientWidth;

interface Section {
	id: string;
	title: string;
	status?: string;
}

const SECTIONS: Section[] = [
	{ id: "status", title: "Status", status: "Healthy" },
	{ id: "agents", title: "Agents", status: "2 running" },
	{ id: "memory", title: "Memory" },
];

// A known row whose status read answers later: `answered` is the read.
function Index(props: { answered: boolean; loading: boolean }) {
	return (
		<List
			items={SECTIONS}
			loading={props.loading}
			row={{
				key: (section) => section.id,
				title: (section) => section.title,
				trailing: (section) => ({ value: section.id.length.toString() }),
				status: (section): RowStatus | undefined => {
					if (section.status === undefined) return undefined;
					if (section.id === "agents" && !props.answered)
						return { loading: true };
					return { state: "done", label: section.status };
				},
				href: (section) => `#${section.id}`,
			}}
		/>
	);
}

function Reads(props: { loading: boolean }) {
	const [answered, setAnswered] = useState(false);
	return (
		<div className="flex flex-col gap-sections">
			<button type="button" onClick={() => setAnswered(true)}>
				Answer
			</button>
			{[390, 440].map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Index answered={answered} loading={props.loading} />
				</div>
			))}
		</div>
	);
}

// The waiting row stands as tall as its answered self, its bar hidden from the
// tree and drawing no word, and the rows under it do not move; a row with no
// status stays a line shorter than one with it.
const waits: Play = async ({ canvas }) => {
	const columns = canvas.getAllByTestId("column");
	const before = columns.map((column) => {
		const rows = within(column).getAllByRole("link");
		return rows.map((link) => {
			const row = link.parentElement;
			if (!row) throw new Error("a row has no box");
			return { top: top(row), height: height(row) };
		});
	});
	for (const [at, column] of columns.entries()) {
		const bars = (name: string) =>
			within(column)
				.getByRole("link", { name })
				.parentElement?.querySelectorAll(".bg-skeleton").length ?? 0;
		await expect(bars("Agents")).toBe(bars("Status") + 1);
		await expect(within(column).queryByText("2 running")).toBeNull();
		const rows = before[at];
		if (!rows) throw new Error("no rows");
		const [status, , memory] = rows;
		if (!status || !memory) throw new Error("a row is missing");
		await expect(rows[1]?.height).toBe(status.height);
		await expect(memory.height).toBeLessThan(status.height);
	}
	await userEvent.click(canvas.getByRole("button", { name: "Answer" }));
	for (const [at, column] of columns.entries()) {
		await expect(within(column).getByText("2 running")).toBeVisible();
		const rows = within(column).getAllByRole("link");
		for (const [index, link] of rows.entries()) {
			const row = link.parentElement;
			const was = before[at]?.[index];
			if (!row || !was) throw new Error("a row has no box");
			await expect(top(row)).toBe(was.top);
			await expect(height(row)).toBe(was.height);
		}
	}
};

export const StatusWaits: StoryObj = {
	render: () => <Reads loading={false} />,
	play: waits,
};

// A List given its items while it loads draws the same.
export const StatusWaitsKnown: StoryObj = {
	render: () => <Reads loading />,
	play: waits,
};

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width = 390): StoryObj {
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

export const StatusWaitsTouch = touch(StatusWaits);
export const StatusWaitsKnownTouch = touch(StatusWaitsKnown);

const REMOTE = "/tmp/fx9/remotes/sailwind-service";
const LONG = "Fetched 5 minutes ago";
const SHORT = "5 min ago";

function Repo(props: { short?: string; meta?: string[] }) {
	return (
		<ListRow
			title="sailwind"
			meta={props.meta ?? [REMOTE, "main"]}
			status={{ state: "done", label: LONG, short: props.short }}
			href="#sailwind"
		/>
	);
}

const WIDTHS = [440, 390, 320];

function Narrow(props: { short?: string }) {
	return (
		<div className="flex flex-col gap-sections">
			{WIDTHS.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Repo short={props.short} />
				</div>
			))}
		</div>
	);
}

// The status draws whole at every width: its long words where they fit, its
// short words where they would be cut, never a fragment; the long words stay
// its name.
const whole: Play = async ({ canvas }) => {
	const drawn: string[] = [];
	for (const column of canvas.getAllByTestId("column")) {
		const inside = within(column);
		const short = inside.queryByText(SHORT);
		const word = short ?? inside.getByText(LONG);
		await expect(clipped(word)).toBe(false);
		drawn.push(short ? "short" : "long");
		if (short) await expect(inside.getByText(LONG)).toBeInTheDocument();
		const row = inside.getByRole("link", { name: "sailwind" }).parentElement;
		if (!row) throw new Error("the row has no box");
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
	}
	await expect(drawn.at(-1)).toBe("short");
};

export const StatusShort: StoryObj = {
	render: () => <Narrow short={SHORT} />,
	play: whole,
};

// A line resized through the width the long form is cut at draws one form per
// width, the same on the way back: no flip between the two.
export const StatusShortResizes: StoryObj = {
	render: () => <Narrow short={SHORT} />,
	play: async ({ canvas }) => {
		const column = canvas.getAllByTestId("column")[0];
		if (!column) throw new Error("no column");
		const forms = async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return within(column).queryByText(SHORT) ? "short" : "long";
		};
		const read: Record<number, string> = {};
		for (const width of [440, 400, 360, 330, 360, 400, 440, 330, 440]) {
			column.style.width = `${width}px`;
			const form = await forms();
			read[width] ??= form;
			await expect(form).toBe(read[width]);
			const word =
				within(column).queryByText(SHORT) ?? within(column).getByText(LONG);
			await expect(clipped(word)).toBe(false);
		}
	},
};

// A row with room, and a status with no short form, are unchanged: the long
// words whole where they fit and cut as before where they do not.
export const StatusLong: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			<div data-testid="room" style={{ width: 600 }} className="max-w-full">
				<Repo short={SHORT} meta={["origin", "main"]} />
			</div>
			<div data-testid="plain" style={{ width: 320 }} className="max-w-full">
				<Repo />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const room = within(canvas.getByTestId("room"));
		await expect(clipped(room.getByText(LONG))).toBe(false);
		await expect(room.queryByText(SHORT)).toBeNull();
		const plain = within(canvas.getByTestId("plain"));
		await expect(plain.queryByText(SHORT)).toBeNull();
		await expect(clipped(plain.getByText(LONG))).toBe(true);
	},
};

export const StatusShortTouch = touch(StatusShort);
export const StatusShortResizesTouch = touch(StatusShortResizes);
export const StatusLongTouch = touch(StatusLong);
