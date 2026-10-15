import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

// A row's status on its meta line: its word truncating where the line is out
// of room, and staying whole at the line's end. A painted row's height is the
// paint stories'.
export default {
	title: "Behaviour/ListRowStatus",
} satisfies Meta;

type Play = NonNullable<StoryObj["play"]>;

const clipped = (element: HTMLElement) =>
	element.scrollWidth > element.clientWidth;

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

const REMOTE = "/tmp/fx9/remotes/sailwind-service";
const LONG = "Fetched 5 minutes ago";

function Repo(props: { meta?: string[] }) {
	return (
		<ListRow
			title="sailwind"
			meta={props.meta ?? [REMOTE, "main"]}
			status={{ state: "done", label: LONG }}
			href="#sailwind"
		/>
	);
}

const WIDTHS = [440, 390, 320];
// The status stays whole beside the first part, which keeps a floor, so its
// word is cut only where the line is less than the word and that floor.
const NARROW = [440, 320, 220];

function Narrow() {
	return (
		<div className="flex flex-col gap-sections">
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

// A status has one form, its word: whole where the line holds it beside the
// first part's floor, truncating where it does not, the row never overflowing.
export const StatusWord: StoryObj = {
	render: () => <Narrow />,
	play: async ({ canvas }) => {
		const cut: boolean[] = [];
		for (const column of canvas.getAllByTestId("column")) {
			const inside = within(column);
			cut.push(clipped(inside.getByText(LONG)));
			const row = inside.getByRole("link", { name: "sailwind" }).parentElement;
			if (!row) throw new Error("the row has no box");
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		}
		await expect(cut[0]).toBe(false);
		await expect(cut.at(-1)).toBe(true);
	},
};

export const StatusWordTouch = touch(StatusWord);

// A part the meta line has no room for goes whole; the status still stands at
// the line's end, so every row's status ends at one x, and the room the part
// leaves before it is under the `figures` the later parts show at least. The
// remotes run from a few letters to a path: at every width some row drops
// `main` with the first part whole.
const REMOTES = Array.from(
	{ length: 14 },
	(_, at) => `/tmp/fx9/${"r".repeat(at * 3)}`,
);

function Drops() {
	return (
		<div className="flex flex-col gap-sections">
			{WIDTHS.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					{REMOTES.map((remote) => (
						<ListRow
							key={remote}
							title={remote}
							meta={[remote, "main"]}
							status={{ state: "done", label: LONG }}
							href={`#${remote}`}
						/>
					))}
				</div>
			))}
		</div>
	);
}

// The right edge of a text's laid-out glyphs, within its box (a cut text
// draws to the box's edge).
const inkRight = (element: Element) => {
	const range = document.createRange();
	range.selectNodeContents(element);
	return Math.min(
		range.getBoundingClientRect().right,
		element.getBoundingClientRect().right,
	);
};

const drops: Play = async ({ canvas }) => {
	for (const column of canvas.getAllByTestId("column")) {
		let dropped = 0;
		const edges: number[] = [];
		let widest = -1;
		for (const remote of REMOTES) {
			const row = within(column).getByRole("link", {
				name: remote,
			}).parentElement;
			const line = row?.querySelector<HTMLElement>(".gap-x-inside.min-w-0");
			const parts = line?.firstElementChild;
			const status = line?.lastElementChild;
			const first = parts?.firstElementChild;
			const later = parts?.children[1];
			if (!row || !line || !parts || !status || !first || !later)
				throw new Error("a row lacks a part");
			edges.push(status.getBoundingClientRect().right);
			// Wrapped away under its slot's one line: its text stands below the
			// slot's top.
			const text = later.lastElementChild;
			if (!text) throw new Error("the later parts have no text");
			const gone =
				text.getBoundingClientRect().top >=
				later.getBoundingClientRect().top + 1;
			if (!gone) continue;
			dropped += 1;
			const figures = Number.parseFloat(getComputedStyle(text).flexBasis);
			await expect(figures).toBeGreaterThan(0);
			// The gap step stands before the status in every row; the rest is the
			// room the dropped part left.
			const gap = Number.parseFloat(getComputedStyle(line).columnGap);
			const left = status.getBoundingClientRect().left - inkRight(first) - gap;
			widest = Math.max(widest, left);
			await expect(left).toBeLessThan(figures);
		}
		await expect(dropped).toBeGreaterThan(0);
		for (const edge of edges)
			await expect(Math.abs(edge - edges[0])).toBeLessThanOrEqual(1);
	}
};

export const MetaDrops: StoryObj = {
	render: () => <Drops />,
	play: drops,
};
export const MetaDropsTouch = touch(MetaDrops);
