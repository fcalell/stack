import { FileRow } from "@fcalell/plugin-react-ui/components/file-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Status } from "@fcalell/plugin-react-ui/components/status";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawListRow } from "@fcalell/plugin-react-ui/showcase/frames/list-row";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

// A row's meta line and a file row's path, at the phone's widths: 320 (the
// pane) and 360 (the list), at the desktop density and, in a 375 px phone, the
// touch one.
const TITLE = "Sign-in from a second device";
const QUOTE = "Let a signed-in account approve a new device from the first one";
const NAME = "payment-terms-and-late-invoices.md";
const EIGHTEEN_MIN_AGO = new Date(Date.now() - 18 * 60_000).toISOString();
const THREE_MIN_AGO = new Date(Date.now() - 3 * 60_000).toISOString();

export default {
	title: "Behaviour/RowMeta",
} satisfies Meta;

function Work() {
	return (
		<ListRow
			title={TITLE}
			meta={["implementing", { quoted: QUOTE }, "pass 1"]}
			trailing={{ age: EIGHTEEN_MIN_AGO, beside: "$0.42" }}
			href="#work"
		/>
	);
}

function Starved() {
	return (
		<ListRow
			title="Rename the flag"
			meta={[
				"Rename the flag to --strict across every message of the repo",
				"round 1",
			]}
			status={{ state: "waiting", label: "Waiting for you" }}
			href="#starved"
		/>
	);
}

function Files() {
	return (
		<>
			<FileRow
				path="biome.json"
				added={12}
				removed={4}
				chip={{ family: "amber", label: "what the check reads" }}
				href="#biome"
			/>
			<FileRow
				path={`docs/billing/${NAME}`}
				added={2}
				removed={1}
				chip={{ family: "amber", label: "what the check reads" }}
				href="#terms"
			/>
		</>
	);
}

function Widths(props: { children: () => React.ReactNode }) {
	return (
		<div className="flex flex-col gap-sections max-w-full">
			<div data-testid="pane" className="w-pane max-w-full">
				{props.children()}
			</div>
			<div data-testid="list" className="w-list max-w-full">
				{props.children()}
			</div>
		</div>
	);
}

const clipped = (element: HTMLElement) =>
	element.scrollWidth > element.clientWidth;
const right = (element: Element) => element.getBoundingClientRect().right;

type Play = NonNullable<StoryObj["play"]>;
type Canvas = Parameters<Play>[0]["canvas"];

const frames = (canvas: Canvas) =>
	["pane", "list"].map((id) => within(canvas.getByTestId(id)));

// A later part yields in order: the model-written one cuts first, the plain
// part and the trailing value after it stay whole, and no box passes its row.
const yielding: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const row = frame.getByRole("link", { name: TITLE }).parentElement;
		if (!row) throw new Error("the row has no box");
		for (const element of row.querySelectorAll("*")) {
			await expect(right(element)).toBeLessThanOrEqual(right(row) + 0.5);
		}
		await expect(clipped(frame.getByText(/“Let a signed/))).toBe(true);
		await expect(clipped(frame.getByText(/pass 1/))).toBe(false);
		await expect(clipped(frame.getByText("18 min · $0.42"))).toBe(false);
	}
};

// A later part with less than `figures` of room draws nothing: it stands
// wrapped under its slot's one line, clipped away, within the slot's width.
const starved: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const part = frame.getByText(/round 1/);
		const slot = part.parentElement?.parentElement;
		if (!slot) throw new Error("the later parts have no slot");
		const box = slot.getBoundingClientRect();
		await expect(part.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			box.bottom - 0.5,
		);
		await expect(part.getBoundingClientRect().width).toBeLessThanOrEqual(
			box.width + 0.5,
		);
	}
};

// A file row's name keeps its floor beside a chip: a short name whole, a long
// one its first three characters, an ellipsis and its end, and the chip's
// label truncates before the path goes below that; the row does not overflow.
const floor: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const short = frame.getByRole("link", { name: "biome.json" }).parentElement;
		const long = frame.getByRole("link", {
			name: `docs/billing/${NAME}`,
		}).parentElement;
		if (!short || !long) throw new Error("a file row has no box");
		await expect(clipped(frame.getByText("bio"))).toBe(false);
		await expect(clipped(frame.getByText("me.json"))).toBe(false);
		const tail = frame.getByText("ces.md");
		const stem = frame.getByText(/^payment-terms/);
		await expect(clipped(tail)).toBe(false);
		await expect(stem.clientWidth).toBeGreaterThanOrEqual(
			(tail.clientWidth / 6) * 4 - 0.5,
		);
		for (const row of [short, long]) {
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		}
	}
};

// A row that opens ends in a chevron after its trailing value; a static row,
// a row with an act and a row with a menu draw none.
const chevrons: Play = async ({ canvas }) => {
	const chevron = (name: string) =>
		canvas
			.getByRole("link", { name })
			.parentElement?.querySelector("svg.lucide-chevron-right");
	const opening = canvas.getByRole("link", { name: "Opens" }).parentElement;
	const mark = chevron("Opens");
	if (!opening || !mark) throw new Error("an opening row draws no chevron");
	await expect(mark.getBoundingClientRect().left).toBeGreaterThanOrEqual(
		canvas.getByText("18 min").getBoundingClientRect().right,
	);
	await expect(right(mark)).toBeLessThanOrEqual(right(opening));
	await expect(chevron("With act")).toBeNull();
	await expect(chevron("With menu")).toBeNull();
	await expect(
		canvas
			.getByText("Static")
			.parentElement?.parentElement?.querySelector("svg.lucide-chevron-right"),
	).toBeNull();
};

export const ChevronEnds: StoryObj = {
	render: () => (
		<div className="flex flex-col w-list max-w-full">
			<ListRow title="Opens" trailing={{ value: "18 min" }} href="#opens" />
			<ListRow title="Static" trailing={{ value: "9 min" }} />
			<ListRow
				title="With act"
				href="#act"
				act={{ label: "Open", onAct: () => {} }}
			/>
			<ListRow
				title="With menu"
				href="#menu"
				more={[{ label: "Copy", icon: "Copy", onAct: () => {} }]}
			/>
		</div>
	),
	play: chevrons,
};

export const MetaYields: StoryObj = {
	render: () => <Widths>{() => <Work />}</Widths>,
	play: yielding,
};

export const MetaStarved: StoryObj = {
	render: () => <Widths>{() => <Starved />}</Widths>,
	play: starved,
};

// A live row's age and spend are one trailing unit in a 335 px column: both
// stand whole beside the status, or neither does, and the row does not overflow.
function Underway() {
	return (
		<div data-testid="column" style={{ width: 335 }} className="max-w-full">
			<ListRow
				title="Morning summary"
				meta={["Stead", "at Collect"]}
				status={{ state: "waiting", label: "Waiting on an item" }}
				trailing={{ age: THREE_MIN_AGO, beside: "$0.12" }}
				href="#underway"
			/>
		</div>
	);
}

const together: Play = async ({ canvas }) => {
	const row = canvas.getByRole("link", {
		name: /Morning summary/,
	}).parentElement;
	if (!row) throw new Error("the row has no box");
	const pair = canvas.queryByText("3 min · $0.12");
	const age = canvas.queryByText(/3 min/);
	await expect(age === null).toBe(pair === null);
	if (pair) {
		await expect(clipped(pair)).toBe(false);
		await expect(right(pair)).toBeLessThanOrEqual(right(row) + 0.5);
	}
};

export const TrailingBeside: StoryObj = {
	render: () => <Underway />,
	play: together,
};

export const FilePathFloor: StoryObj = {
	render: () => <Widths>{() => <Files />}</Widths>,
	play: floor,
};

// The same scenarios in a phone (375 px unless a width is given) at the touch
// density.
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

export const MetaYieldsTouch = touch(MetaYields);
export const MetaStarvedTouch = touch(MetaStarved);
export const FilePathFloorTouch = touch(FilePathFloor);
export const TrailingBesideTouch = touch(TrailingBeside);

// A review page's sensitive files: `Place` > `Section` > `List` of `file` rows,
// each seen or not, with a chip saying why it is listed and its counts, two
// short names and a long one, at the page's width; the same list again in a
// `Group`. The name keeps its floor, the chip's label gives way only once the
// path is at it, and the counts end at the row's inset, so no width stands
// unused beside them.
const SENSITIVE = [
	{
		path: "biome.json",
		added: 12,
		removed: 4,
		seen: false,
		label: "what the check reads",
	},
	{
		path: "docs/flags.md",
		added: 3,
		removed: 0,
		seen: true,
		label: "what the check reads",
	},
	{
		path: `docs/billing/${NAME}`,
		added: 2,
		removed: 1,
		seen: false,
		label: "what the check reads",
	},
];

function Review(props: { width: number; grouped?: boolean }) {
	const files = (
		<List
			items={SENSITIVE}
			file={{
				key: (f) => f.path,
				path: (f) => f.path,
				added: (f) => f.added,
				removed: (f) => f.removed,
				seen: (f) => f.seen,
				chip: (f) => ({ family: "amber", label: f.label }),
				href: (f) => `#${f.path}`,
			}}
		/>
	);
	return (
		<div
			style={{
				width: props.width,
				height: 700,
				display: "flex",
				flexDirection: "column",
				// Headless Linux hints a glyph's advance to a whole pixel; macOS and
				// Windows draw it fractional, where a floor in `ch` can fall short.
				textRendering: "geometricPrecision",
			}}
		>
			<Place title="Review">
				<Section title="Sensitive changes" description="1 of 3 opened">
					{props.grouped ? <Group>{files}</Group> : files}
				</Section>
			</Place>
		</div>
	);
}

// The app's mono font, as the theme declares it, drawn before a row is
// measured: a fallback mono advances a glyph differently, and the floor is
// judged against the advance the app draws.
const mono = async () => {
	await Promise.all(
		["400", "500"].map((weight) =>
			document.fonts.load(`${weight} 15px "IBM Plex Mono"`),
		),
	);
	await expect(
		[...document.fonts].some(
			(face) =>
				face.family.includes("IBM Plex Mono") && face.status === "loaded",
		),
	).toBe(true);
};

// A text's laid-out width, past its box's clip, against the box's width: the
// sub-pixel truth `scrollWidth` rounds away.
const drawn = (element: Element) => {
	const range = document.createRange();
	range.selectNodeContents(element);
	return range.getBoundingClientRect().width;
};
const whole = (element: Element) =>
	drawn(element) <= element.getBoundingClientRect().width;

const reviewed: Play = async ({ canvas }) => {
	await mono();
	for (const file of SENSITIVE) {
		const row = canvas.getByRole("link", { name: file.path }).parentElement;
		const path = row?.querySelector<HTMLElement>(".font-mono");
		const counts = row?.lastElementChild;
		const chip = counts?.previousElementSibling;
		const name = path?.lastElementChild;
		const stem = name?.firstElementChild;
		const tail = name?.lastElementChild;
		if (!row || !path || !counts || !chip || !stem || !tail || !name)
			throw new Error("a file row lacks a part");
		const inset = Number.parseFloat(getComputedStyle(row).paddingRight);
		const gap = Number.parseFloat(getComputedStyle(row).columnGap);
		const floor = Number.parseFloat(getComputedStyle(path).minWidth);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		await expect(Math.abs(right(row) - inset - right(counts))).toBeLessThan(1);
		await expect(
			counts.getBoundingClientRect().left - right(chip),
		).toBeLessThan(gap + 1);
		await expect(whole(tail)).toBe(true);
		if (file.path.includes("/billing/")) {
			const chars = tail.textContent?.length ?? 1;
			await expect(stem.clientWidth).toBeGreaterThanOrEqual(
				(drawn(tail) / chars) * 4 - 0.5,
			);
		} else await expect(whole(stem)).toBe(true);
		const label = within(chip as HTMLElement).getByText(file.label);
		if (clipped(label))
			await expect(path.getBoundingClientRect().width).toBeLessThanOrEqual(
				floor + 0.5,
			);
	}
};

export const ReviewFloor320: StoryObj = {
	render: () => <Review width={320} />,
	play: reviewed,
};
export const ReviewFloor390: StoryObj = {
	render: () => <Review width={390} />,
	play: reviewed,
};
export const ReviewFloor768: StoryObj = {
	render: () => <Review width={768} />,
	play: reviewed,
};
export const ReviewGroupFloor320: StoryObj = {
	render: () => <Review width={320} grouped />,
	play: reviewed,
};
export const ReviewFloorTouch320 = touch(ReviewFloor320, 320);
export const ReviewFloorTouch390 = touch(ReviewFloor390, 390);
export const ReviewGroupFloorTouch390 = touch(
	{ render: () => <Review width={390} grouped />, play: reviewed },
	390,
);
export const ChevronEndsTouch = touch(ChevronEnds);

// A status label draws whole while its line has room and truncates, within its
// row, only when the line is out of it; no measure caps it short of the room:
// a row's, a head's fact (`Status` alone) as well. Desktop only: the room is
// the frame's, not the density's.
const WATCHES = "Watches paused for under a minute while the repository syncs";

const statusRoom: Play = async ({ canvas }) => {
	const room = within(canvas.getByTestId("room"));
	const tight = within(canvas.getByTestId("tight"));
	await expect(clipped(room.getByText(WATCHES))).toBe(false);
	await expect(clipped(room.getByText("Fetched 28 seconds ago"))).toBe(false);
	await expect(clipped(tight.getByText(WATCHES))).toBe(true);
	const row = tight.getByRole("link", { name: "Usage" }).parentElement;
	if (!row) throw new Error("the row has no box");
	for (const element of row.querySelectorAll("*")) {
		await expect(right(element)).toBeLessThanOrEqual(right(row) + 0.5);
	}
};

function Usage() {
	return (
		<>
			<ListRow
				title="Usage"
				meta={["System"]}
				status={{ state: "waiting", label: WATCHES }}
				href="#usage"
			/>
			<Status state="done" label="Fetched 28 seconds ago" />
		</>
	);
}

export const StatusRoom: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections max-w-full">
			<div data-testid="room" className="w-sheet max-w-full">
				<Usage />
			</div>
			<div data-testid="tight" className="w-pane max-w-full">
				<Usage />
			</div>
		</div>
	),
	play: statusRoom,
};

// Code in a row: a title of runs draws the code in the inline code style and
// truncates at its end; a path that is a whole title or a whole meta part cuts
// in its middle and keeps its end. Desktop and touch, at 320 and 360.
const SENTENCE = "turns strict mode on for every package in the workspace";
const PATH = "packages/server/src/worker/plugins/registry.ts";
const CWD = "/tmp/stead-fx-u9/repo-one/packages/server";

function Codes() {
	return (
		<>
			<ListRow
				title={[{ code: "--strict" }, ` ${SENTENCE}`]}
				meta={["criterion"]}
				href="#strict"
			/>
			<ListRow
				title={{ code: PATH }}
				trailing={{ value: "9 min" }}
				href="#path"
			/>
			<ListRow
				title="Sensitive path"
				meta={["sensitive", { code: CWD }]}
				href="#cwd"
			/>
		</>
	);
}

const rowOf = (frame: ReturnType<typeof within>, name: string) => {
	const row = frame.getByRole("link", { name }).parentElement;
	if (!row) throw new Error("the row has no box");
	return row;
};

const coded: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const runs = rowOf(frame, `--strict ${SENTENCE}`);
		const code = frame.getByText("--strict");
		await expect(code.tagName).toBe("CODE");
		const title = code.parentElement;
		if (!title) throw new Error("the code has no title");
		await expect(title.textContent).toBe(`--strict ${SENTENCE}`);
		await expect(clipped(title)).toBe(true);
		await expect(right(code)).toBeLessThanOrEqual(right(runs) + 0.5);

		const whole = rowOf(frame, PATH);
		const tail = frame.getByText("y.ts");
		const stem = frame.getByText(PATH.slice(0, -4));
		await expect(clipped(stem)).toBe(true);
		await expect(clipped(tail)).toBe(false);
		await expect(right(tail)).toBeLessThanOrEqual(right(whole) + 0.5);
		await expect(clipped(frame.getByText("9 min"))).toBe(false);

		const meta = rowOf(frame, "Sensitive path");
		const end = frame.getByText("rver");
		const start = frame.getByText(CWD.slice(0, -4));
		await expect(clipped(start)).toBe(true);
		await expect(clipped(end)).toBe(false);
		for (const element of meta.querySelectorAll("*")) {
			await expect(right(element)).toBeLessThanOrEqual(right(meta) + 0.5);
		}
	}
};

export const CodeRuns: StoryObj = {
	render: () => <Widths>{() => <Codes />}</Widths>,
	play: coded,
};

export const CodeRunsTouch = touch(CodeRuns);

// The ListRow showcase's rest frame holds the work rows: a live age with its
// spend in the trailing, in a 335 px column (narrower where the screen is).
const WORK_FRAMES = showcaseFrames().filter(
	(frame) =>
		frame.component === "ListRow" &&
		frame.cell.name === "ROW.lines.two" &&
		frame.state === "rest" &&
		frame.mode === "light",
);

export const ShowcaseHoldsAgeBesideSpend: StoryObj = {
	render: () => (
		<div>
			{WORK_FRAMES.filter((frame) => frame.density === "desktop").map(
				(frame) => (
					<Frame key={frame.id} frame={frame} draw={drawListRow} />
				),
			)}
		</div>
	),
	play: async ({ canvasElement }) => {
		const spend = within(canvasElement).getByText(/\$0\.42/);
		await expect(spend.textContent).toMatch(/\d+ min · \$0\.42/);
		await expect(spend.scrollWidth).toBeLessThanOrEqual(spend.clientWidth);
		const column = canvasElement.querySelector<HTMLElement>(
			"[class*='w-[335px]']",
		);
		await expect(column?.getBoundingClientRect().width).toBeLessThanOrEqual(
			335,
		);
	},
};

export const ShowcaseHoldsAgeBesideSpendTouch = touch(
	ShowcaseHoldsAgeBesideSpend,
	320,
);
