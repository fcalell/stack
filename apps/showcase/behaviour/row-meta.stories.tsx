import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { lineStarts } from "./support.ts";

const pressed = fn();

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
		<Section
			items={[
				{
					key: "row",
					title: TITLE,
					meta: ["implementing", { quoted: QUOTE }, "pass 1"],
					trailing: { age: EIGHTEEN_MIN_AGO, beside: "$0.42" },
					href: "#work",
				},
			]}
		/>
	);
}

// A meta of one line, of two (about sixty characters) and of more than two,
// which ends in an ellipsis at the end of the second.
const ONE = "Your name and email";
const TWO = "Who you are, your sign-in and your devices across workspaces";
const MORE =
	"Who you are, your sign-in and your devices across workspaces, the roles you hold in each, the invitations still waiting for an answer and the keys you have issued";

function Lengths() {
	return (
		<Section
			items={[
				{ key: "row", title: "One", meta: [ONE], href: "#one" },
				{ key: "row1", title: "Two", meta: [TWO], href: "#two" },
				{ key: "row2", title: "More", meta: [MORE], href: "#more" },
			]}
		/>
	);
}

function Files() {
	return (
		<Section
			items={[
				{
					key: "row",
					path: "biome.json",
					added: 12,
					removed: 4,
					chip: { family: "amber", label: "what the check reads" },
					href: "#biome",
				},
				{
					key: "row3",
					path: `docs/billing/${NAME}`,
					added: 2,
					removed: 1,
					chip: { family: "amber", label: "what the check reads" },
					href: "#terms",
				},
			]}
		/>
	);
}

function Widths(props: { children: () => React.ReactNode }) {
	return (
		<div className="flex flex-col gap-section max-w-full">
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

// The lines a text draws.
const linesOf = (element: HTMLElement) =>
	Math.round(
		element.getBoundingClientRect().height /
			Number.parseFloat(getComputedStyle(element).lineHeight),
	);
// A text cut at the end of its last line, which its box holds clipped.
const cutDown = (element: HTMLElement) =>
	element.scrollHeight > element.clientHeight + 1;

// A meta is one text of at most two lines: its parts stand in order, no box
// passes its row, and the trailing value stays whole in its end group.
const wraps: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const row = frame.getByRole("link", { name: TITLE }).parentElement;
		if (!row) throw new Error("the row has no box");
		for (const element of row.querySelectorAll("*")) {
			await expect(right(element)).toBeLessThanOrEqual(right(row) + 0.5);
		}
		const meta = frame.getByText(/^implementing/);
		await expect(linesOf(meta)).toBeLessThanOrEqual(2);
		await expect(meta.textContent).toMatch(/“Let a signed.*”\s·\spass 1$/);
		await expect(clipped(frame.getByText("18 min · $0.42"))).toBe(false);
	}
};

// A meta takes the lines it needs up to two, then ends in an ellipsis at the
// end of the second, and a one-line row is as tall as it was.
const lengths: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		const one = frame.getByText(ONE);
		const two = frame.getByText(TWO);
		const more = frame.getByText(
			/^Who you are, your sign-in and your devices across workspaces, the roles/,
		);
		await expect(linesOf(one)).toBe(1);
		await expect(linesOf(two)).toBe(2);
		await expect(cutDown(two)).toBe(false);
		await expect(linesOf(more)).toBe(2);
		await expect(cutDown(more)).toBe(true);
		const rows = ["One", "Two", "More"].map(
			(name) => frame.getByRole("link", { name }).parentElement,
		);
		const [short, tall] = rows.map(
			(row) => row?.getBoundingClientRect().height,
		);
		await expect(tall).toBeGreaterThan(short ?? 0);
		for (const row of rows) {
			if (!row) throw new Error("the row has no box");
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		}
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

// A held row's chip stands beside its lock: the lock yields its label to its
// glyph before the chip folds, at every width that holds the glyph and the
// chip, and the chip comes back as the row grows again.
export const LockKeepsChip: StoryObj = {
	render: () => (
		<div data-testid="held" className="max-w-full" style={{ width: 720 }}>
			<Section
				items={[
					{
						key: "row",
						title: "Mixpanel production",
						meta: ["Destination"],
						lock: "Held by Add purchase events to the checkout flow",
						chip: { family: "violet", label: "Tag manager" },
						href: "#held",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const held = canvas.getByTestId("held");
		const folded = () => held.querySelectorAll("span.absolute.opacity-0");
		for (const width of [720, 360, 720]) {
			held.style.width = `${width}px`;
			await waitFor(() => expect(folded()).toHaveLength(0));
			await expect(canvas.getByText("Tag manager")).toBeVisible();
			await expect(
				canvas.getByText("Tag manager").getBoundingClientRect().right,
			).toBeLessThanOrEqual(held.getBoundingClientRect().right + 0.5);
		}
	},
};

export const ChevronEnds: StoryObj = {
	render: () => (
		<div className="flex flex-col w-list max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Opens",
						trailing: { value: "18 min" },
						href: "#opens",
					},
					{ key: "row4", title: "Static", trailing: { value: "9 min" } },
					{
						key: "row5",
						title: "With act",
						href: "#act",
						act: { label: "Open", onAct: pressed },
					},
					{
						key: "row6",
						title: "With menu",
						href: "#menu",
						more: [{ label: "Copy", icon: "Copy", onAct: pressed }],
					},
				]}
			/>
		</div>
	),
	play: chevrons,
};

export const MetaWraps: StoryObj = {
	render: () => <Widths>{() => <Work />}</Widths>,
	play: wraps,
};

export const MetaLengths: StoryObj = {
	render: () => <Widths>{() => <Lengths />}</Widths>,
	play: lengths,
};

// A live row's age and spend are one trailing unit in a 335 px column: both
// stand whole beside the status, or neither does, and the row does not overflow.
function Underway() {
	return (
		<div data-testid="column" style={{ width: 335 }} className="max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Morning summary",
						meta: ["Stead", "at Collect"],
						status: { tone: "waiting", label: "Waiting on an item" },
						trailing: { age: THREE_MIN_AGO, beside: "$0.12" },
						href: "#underway",
					},
				]}
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

export const MetaWrapsTouch = { ...touch(MetaWraps), tags: ["touch"] };
export const MetaLengthsTouch = { ...touch(MetaLengths), tags: ["touch"] };
export const FilePathFloorTouch = { ...touch(FilePathFloor), tags: ["touch"] };
export const TrailingBesideTouch = {
	...touch(TrailingBeside),
	tags: ["touch"],
};

// A review page's sensitive files: `Place` > `Section` > `List` of `file` rows,
// each seen or not, with a chip saying why it is listed and its counts, two
// short names and a long one, at the page's width. The name keeps its floor, the chip's label gives way only once the
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

function Review(props: { width: number }) {
	const files: Row[] = SENSITIVE.map((f) => ({
		key: f.path,
		path: f.path,
		added: f.added,
		removed: f.removed,
		seen: f.seen,
		chip: { family: "amber", label: f.label },
		href: `#${f.path}`,
	}));
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
			<Place>
				<Pane title="Review">
					<Section
						title="Sensitive changes"
						description="1 of 3 opened"
						items={files}
					/>
				</Pane>
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
// A label is drawn whole only if its text fits its box to the sub-pixel:
// Chromium draws the ellipsis when the text is a hundredth of a pixel wider
// than the box, which `scrollWidth` (a rounded integer) never reports.
const labelWhole = (element: HTMLElement) =>
	!clipped(element) && whole(element);

// `mayCut` names the rows whose chip label may truncate at the width (the row
// is at its floor there and the label cannot be whole beside it).
const review =
	(mayCut: (path: string) => boolean): Play =>
	async ({ canvas }) => {
		await mono();
		for (const file of SENSITIVE) {
			const row = canvas.getByRole("link", { name: file.path }).parentElement;
			const path = row?.querySelector<HTMLElement>(".font-mono");
			// The counts' block stands aside (`display: contents`): its lanes are
			// the row's items.
			const counts = row?.lastElementChild;
			const lanes = [...(counts?.children ?? [])];
			const chip = counts?.previousElementSibling;
			const name = path?.lastElementChild;
			const stem = name?.firstElementChild;
			const tail = name?.lastElementChild;
			if (
				!row ||
				!path ||
				!counts ||
				!chip ||
				!stem ||
				!tail ||
				!name ||
				!lanes[0] ||
				!lanes[1]
			)
				throw new Error("a file row lacks a part");
			const inset = Number.parseFloat(getComputedStyle(row).paddingRight);
			const gap = Number.parseFloat(getComputedStyle(row).columnGap);
			const floor = Number.parseFloat(getComputedStyle(path).minWidth);
			await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
			await expect(Math.abs(right(row) - inset - right(lanes[1]))).toBeLessThan(
				1,
			);
			await expect(
				lanes[0].getBoundingClientRect().left - right(chip),
			).toBeLessThan(gap + 1);
			await expect(whole(tail)).toBe(true);
			if (file.path.includes("/billing/")) {
				const chars = tail.textContent?.length ?? 1;
				await expect(stem.clientWidth).toBeGreaterThanOrEqual(
					(drawn(tail) / chars) * 4 - 0.5,
				);
			} else await expect(whole(stem)).toBe(true);
			// A directory that gives way reads as cut: its box holds its first
			// character and an ellipsis, measured as a probe in the same font (a
			// one-character box draws a clipped sliver, never the ellipsis), and
			// the text it holds is still whole or cut by the box's own overflow.
			const directory =
				name === path.firstElementChild ? null : path.firstElementChild;
			if (directory && !whole(directory)) {
				const probe = document.createElement("span");
				probe.style.cssText = "position:absolute;visibility:hidden";
				probe.textContent = `${directory.textContent?.[0]}\u2026`;
				directory.append(probe);
				const lead = probe.getBoundingClientRect().width;
				probe.remove();
				await expect(
					directory.getBoundingClientRect().width,
				).toBeGreaterThanOrEqual(lead - 0.5);
				await expect(directory.scrollWidth).toBeGreaterThan(
					directory.clientWidth,
				);
			}
			// The chip's label is cut only once the path stands at its floor and the
			// counts at their text; where the room allows it, it is whole.
			const label = within(chip as HTMLElement).getByText(file.label);
			if (!labelWhole(label)) {
				await expect(mayCut(file.path)).toBe(true);
				await expect(path.getBoundingClientRect().width).toBeLessThanOrEqual(
					floor + 0.5,
				);
				for (const lane of lanes)
					await expect(lane.getBoundingClientRect().width).toBeLessThanOrEqual(
						drawn(lane) + 0.5,
					);
			}
		}
	};
// At 320 `biome.json` cannot hold its label beside its floor and the counts,
// nor can the long billing row; `docs/flags.md` can.
const reviewed = review((path) => !path.endsWith("flags.md"));
// Any row may cut (the touch lead takes room, a Group takes more).
const reviewedAny = review(() => true);
// A page's width at which the chip's label has room whole beside the path's
// floor and the counts yielded.
const reviewedWhole = review(() => false);
// Touch 390: the long billing row's label is 5 px short beside the lead.
const reviewedBilling = review((path) => path.includes("/billing/"));

export const ReviewFloor320: StoryObj = {
	render: () => <Review width={320} />,
	play: reviewed,
};
export const ReviewFloor390: StoryObj = {
	render: () => <Review width={390} />,
	play: reviewedWhole,
};
export const ReviewFloor768: StoryObj = {
	render: () => <Review width={768} />,
	play: reviewedWhole,
};
export const ReviewGroupFloor320: StoryObj = {
	render: () => <Review width={320} />,
	play: reviewedAny,
};
export const ReviewFloorTouch320 = {
	...touch({ render: () => <Review width={320} />, play: reviewedAny }, 320),
	tags: ["touch"],
};
// On touch the directory's lead is 22 px (two 11 px characters), which leaves
// the long billing row's label 5 px short of whole at 390: it may cut there,
// by the same rule as at 320 (only once the path stands at its floor).
export const ReviewFloorTouch390 = {
	...touch(
		{ render: () => <Review width={390} />, play: reviewedBilling },
		390,
	),
	tags: ["touch"],
};
export const ReviewGroupFloorTouch390 = {
	...touch({ render: () => <Review width={390} />, play: reviewedAny }, 390),
	tags: ["touch"],
};
export const ChevronEndsTouch = { ...touch(ChevronEnds), tags: ["touch"] };

// A text is cut only where the row's text group is down to its floor, two
// fifths of the row's content width (the end group takes the rest).
const cutOnlyAtCap = async (row: Element, text: HTMLElement) => {
	if (!clipped(text)) return;
	const group = row.querySelector<HTMLElement>("[class*='basis-2/5']");
	if (!group) throw new Error("the row has no text group");
	const style = getComputedStyle(row);
	const inner =
		row.clientWidth -
		Number.parseFloat(style.paddingLeft) -
		Number.parseFloat(style.paddingRight);
	await expect(group.getBoundingClientRect().width).toBeLessThanOrEqual(
		inner * 0.4 + 1,
	);
};

// A list row's status whose word does not fit stands as its dot: the word is
// there for a screen reader and drawn at no opacity.
const dotAlone = (word: HTMLElement) =>
	getComputedStyle(word).opacity === "0" &&
	(word.parentElement?.getBoundingClientRect().width ?? 0) > 0;

// A status label draws whole while its line has room and, when the line is out
// of it, the status stands as its dot alone (the word kept out of sight, for a
// screen reader), never the word cut; no measure caps it short of the room: a
// row's, a head's fact (`Status` alone) as well. Desktop only: the room is the
// frame's, not the density's.
const WATCHES = "Watches paused for under a minute while the repository syncs";

const statusRoom: Play = async ({ canvas }) => {
	const room = within(canvas.getByTestId("room"));
	const tight = within(canvas.getByTestId("tight"));
	const sheet = room.getByRole("link", { name: "Usage" }).parentElement;
	if (!sheet) throw new Error("the row has no box");
	await cutOnlyAtCap(sheet, room.getByText(WATCHES));
	await expect(clipped(room.getByText("Fetched 28 seconds ago"))).toBe(false);
	await expect(dotAlone(tight.getByText(WATCHES))).toBe(true);
	const row = tight.getByRole("link", { name: "Usage" }).parentElement;
	if (!row) throw new Error("the row has no box");
	for (const element of row.querySelectorAll("*")) {
		await expect(right(element)).toBeLessThanOrEqual(right(row) + 0.5);
	}
};

function Usage() {
	return (
		<>
			<Section
				items={[
					{
						key: "row",
						title: "Usage",
						meta: ["System"],
						status: { tone: "waiting", label: WATCHES },
						href: "#usage",
					},
				]}
			/>
			<Section
				items={[
					{
						label: "Fetch",
						title: { status: "done", label: "Fetched 28 seconds ago" },
					},
				]}
			/>
		</>
	);
}

export const StatusRoom: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section max-w-full">
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

// A row's status stands in its end group, whole while the group is within
// the room the text group's two fifths leave and as its dot alone once the word
// is not. Desktop and touch, in a 320 px pane and a 360 px list.
const REMOTE = "/tmp/sc3/remotes/a-repository-with-a-name-long-enough-to-wrap";

function Statuses() {
	return (
		<Section
			items={[
				{
					key: "row",
					title: "a-repository-with-a-name-long-enough-to-wrap",
					meta: [REMOTE],
					status: { tone: "done", label: "Fetched 3 minutes ago" },
					href: "#remote",
				},
				{
					key: "row7",
					title: "Rename the flag",
					meta: ["Rename the flag to --strict across every message", "round 1"],
					status: { tone: "waiting", label: "Waiting for you" },
					href: "#flag",
				},
				{
					key: "row8",
					title: "Usage",
					meta: ["System"],
					status: {
						tone: "waiting",
						label: "Watches paused for usage \u00b7 resumes 1:17 PM tomorrow",
					},
					href: "#usage-long",
				},
			]}
		/>
	);
}

const statusWhole: Play = async ({ canvas }) => {
	for (const frame of frames(canvas)) {
		for (const name of [REMOTE.split("/").pop(), "Rename the flag"]) {
			const row = frame.getByRole("link", { name }).parentElement;
			if (!row) throw new Error("the row has no box");
			for (const element of row.querySelectorAll("*")) {
				await expect(right(element)).toBeLessThanOrEqual(right(row) + 0.5);
			}
		}
		const remote = frame.getByRole("link", {
			name: REMOTE.split("/").pop(),
		}).parentElement;
		if (!remote) throw new Error("the row has no box");
		await cutOnlyAtCap(remote, frame.getByText("Fetched 3 minutes ago"));
		await expect(linesOf(frame.getByText(REMOTE))).toBeLessThanOrEqual(2);
		const flag = frame.getByRole("link", {
			name: "Rename the flag",
		}).parentElement;
		if (!flag) throw new Error("the row has no box");
		await cutOnlyAtCap(flag, frame.getByText("Waiting for you"));
		await expect(
			linesOf(frame.getByText(/^Rename the flag to --strict/)),
		).toBeLessThanOrEqual(2);
		const long = frame.getByRole("link", { name: "Usage" }).parentElement;
		if (!long) throw new Error("the row has no box");
		await expect(dotAlone(frame.getByText(/^Watches paused/))).toBe(true);
		for (const element of long.querySelectorAll("*")) {
			await expect(right(element)).toBeLessThanOrEqual(right(long) + 0.5);
		}
	}
};

export const StatusStaysWhole: StoryObj = {
	render: () => <Widths>{() => <Statuses />}</Widths>,
	play: statusWhole,
};

// Code in a row: a title of runs draws the code in the inline code style and
// truncates at its end; a path that is a whole title cuts in its middle and
// keeps its end; a code part in a meta is a run of its text, which wraps. Desktop and touch, at 320 and 360.
const SENTENCE = "turns strict mode on for every package in the workspace";
const PATH = "packages/server/src/worker/plugins/registry.ts";
const CWD = "/tmp/stead-fx-u9/repo-one/packages/server";

function Codes() {
	return (
		<Section
			items={[
				{
					key: "row",
					title: [{ code: "--strict" }, ` ${SENTENCE}`],
					meta: ["criterion"],
					href: "#strict",
				},
				{
					key: "row9",
					title: { code: PATH },
					trailing: { value: "9 min" },
					href: "#path",
				},
				{
					key: "row10",
					title: "Sensitive path",
					meta: ["sensitive", { code: CWD }],
					href: "#cwd",
				},
			]}
		/>
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
		const run = frame.getByText(CWD);
		await expect(run.tagName).toBe("CODE");
		const line = run.parentElement;
		if (!line) throw new Error("the code has no meta line");
		await expect(linesOf(line)).toBeLessThanOrEqual(2);
		for (const element of meta.querySelectorAll("*")) {
			await expect(right(element)).toBeLessThanOrEqual(right(meta) + 0.5);
		}
	}
};

export const CodeRuns: StoryObj = {
	render: () => <Widths>{() => <Codes />}</Widths>,
	play: coded,
};

export const CodeRunsTouch = { ...touch(CodeRuns), tags: ["touch"] };

// A work row: a live age with its spend in the trailing, in a 335 px column
// (narrower where the screen is).
export const ShowcaseHoldsAgeBesideSpend: StoryObj = {
	render: () => (
		<div className="w-[335px] max-w-full">
			<Work />
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

export const ShowcaseHoldsAgeBesideSpendTouch = {
	...touch(ShowcaseHoldsAgeBesideSpend, 320),
	tags: ["touch"],
};

// A code part among the meta parts never collapses to nothing and is never drawn
// past the meta line's box, at the phone's widths and below them.
const STEPS = [
	{ title: "Open the cart", meta: ["Visit", { code: "cart" }, "to Cart"] },
	{ title: "Sign in", meta: ["Visit", { code: "login" }] },
];
const STEP_WIDTHS = [440, 390, 320, 260];

function Steps() {
	return (
		<div className="flex flex-col gap-section">
			{STEP_WIDTHS.map((width) => (
				<div
					key={width}
					data-testid="column"
					style={{ width }}
					className="max-w-full"
				>
					<Section
						items={STEPS.map((step) => ({
							key: step.title,
							title: step.title,
							meta: step.meta,
							status: { tone: "failed" as const, label: "Failing" },
							chip: { family: "neutral" as const, label: "account" },
							href: `#${step.title}`,
						}))}
					/>
				</div>
			))}
		</div>
	);
}

export const MetaCodeKeepsItsBox: StoryObj = {
	render: () => <Steps />,
	play: async ({ canvas }) => {
		await document.fonts.ready;
		for (const column of canvas.getAllByTestId("column")) {
			for (const step of STEPS) {
				const row = rowOf(within(column), step.title);
				const code = row.querySelector("code");
				const line = code?.parentElement;
				if (!code || !line) throw new Error("the row has no code part");
				// Not collapsed: the code keeps more than a letter's room.
				const size = Number.parseFloat(getComputedStyle(code).fontSize);
				await expect(code.getBoundingClientRect().width).toBeGreaterThan(size);
				// The line draws inside its own box, the code within it.
				await expect(line.scrollWidth).toBeLessThanOrEqual(
					line.clientWidth + 0.5,
				);
				await expect(right(code)).toBeLessThanOrEqual(right(line) + 0.5);
			}
		}
	},
};
export const MetaCodeKeepsItsBoxTouch = {
	...touch(MetaCodeKeepsItsBox),
	tags: ["touch"],
};
// In a 320 px phone, the narrowest the rows are drawn in.
export const MetaCodeKeepsItsBoxTouch320 = {
	...touch(MetaCodeKeepsItsBox, 320),
	tags: ["touch"],
};

// A loaded meta part with no text draws nothing, so no separator dangles
// after the part before it: the line holds the parts that say something, and
// a row whose parts are all empty draws no meta line.
export const MetaDropsEmptyParts: StoryObj = {
	render: () => (
		<div data-testid="pane" className="w-pane max-w-full">
			<Section
				items={[
					{
						key: "row",
						title: "Lead and later",
						meta: ["Outfitters web", ""],
						href: "#lead",
					},
					{
						key: "row11",
						title: "Empty lead",
						meta: ["", "implementing", ""],
						href: "#empty-lead",
					},
					{
						key: "row12",
						title: "Nothing to say",
						meta: ["", ""],
						href: "#nothing",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const line = (name: string) =>
			canvas.getByRole("link", { name }).parentElement?.textContent;
		await expect(line("Lead and later")).not.toContain("·");
		await expect(line("Empty lead")).not.toContain("·");
		await expect(line("Empty lead")).toContain("implementing");
		const bare = canvas.getByRole("link", { name: "Nothing to say" });
		const lead = canvas.getByRole("link", { name: "Lead and later" });
		await expect(
			lead.parentElement?.getBoundingClientRect().height,
		).toBeGreaterThan(bare.parentElement?.getBoundingClientRect().height ?? 0);
	},
};

// A wrapped meta line never starts on a dot: the dot stays with the part before
// it, ending the line, whichever words the line breaks between. A row at each of
// a run of widths puts a break at every part.
export const MetaNeverStartsOnADot: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section">
			{Array.from({ length: 12 }, (_, at) => 220 + at * 12).map((width) => (
				<div key={width} data-testid="column" style={{ width }}>
					<Section
						items={[
							{
								key: "row",
								title: "Watches",
								meta: [
									"Who you are",
									"your sign-in and your devices",
									{ code: "stead/entry" },
									"Calls Deep",
									"Watches paused for usage · resumes 8:09 PM",
								],
								href: "#watches",
							},
						]}
					/>
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		for (const column of canvas.getAllByTestId("column")) {
			const text =
				column.querySelector("a")?.nextElementSibling?.lastElementChild;
			if (!text) throw new Error("the row has no meta line");
			await expect(lineStarts(text)).not.toContain("·");
		}
	},
};
export const MetaNeverStartsOnADotTouch = {
	...touch(MetaNeverStartsOnADot, 320),
	tags: ["touch"],
};
