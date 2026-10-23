import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const VIEWS = [
	{ value: "list", label: "List" },
	{ value: "board", label: "Board" },
	{ value: "calendar", label: "Calendar" },
];

function Views() {
	const [view, setView] = useState("list");
	return (
		<Picker
			fit="segments"
			label="View"
			options={VIEWS}
			value={view}
			onChange={setView}
		/>
	);
}

export default {
	title: "Behaviour/Picker as segments",
	render: () => <Views />,
} satisfies Meta;

// A radio group: one tab stop on the chosen segment, the arrow keys move the
// choice (and wrap), and the group is named.
export const RadioGroup: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const group = canvas.getByRole("radiogroup", { name: "View" });
		const [list, board, calendar] = canvas.getAllByRole("radio");
		await expect(group).toBeInTheDocument();
		await expect(list).toBeChecked();
		await userEvent.tab();
		await expect(list).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(board).toBeChecked());
		await expect(board).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(calendar).toBeChecked());
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(list).toBeChecked());
		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(() => expect(calendar).toBeChecked());
	},
};

// Directly in a Pane's body, whose children are capped at the measure, the track
// is still held to its column: four options wider than a 320 px page scroll
// inside the track instead of the track overrunning the body and scrolling it
// sideways with the chosen segment off the screen.
const TABS = [
	{ value: "undocumented", label: "Undocumented" },
	{ value: "dead", label: "Dead" },
	{ value: "unplanned", label: "Unplanned" },
	{ value: "imports", label: "Imports" },
];

function Tabs() {
	const [tab, setTab] = useState("imports");
	return (
		<div
			style={{ width: 320, height: 400 }}
			className="flex flex-col max-w-none"
		>
			<Place>
				<Pane title="Inventory">
					<Picker
						fit="segments"
						label="Inventory"
						options={TABS}
						value={tab}
						onChange={setTab}
					/>
				</Pane>
			</Place>
		</div>
	);
}

export const TrackStaysInItsColumnAt320: StoryObj = {
	render: () => <Tabs />,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvas, canvasElement }) => {
		await document.fonts.ready;
		const group = canvas.getByRole("radiogroup", { name: "Inventory" });
		const body = group.parentElement as HTMLElement;
		const track = group.getBoundingClientRect();
		const column = body.getBoundingClientRect();
		await expect(track.right).toBeLessThanOrEqual(column.right + 0.5);
		await expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
		// The chosen segment is on the screen.
		const [chosen] = canvas.getAllByRole("radio", { checked: true });
		await expect(chosen?.getBoundingClientRect().right).toBeLessThanOrEqual(
			column.right + 0.5,
		);
		await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
			canvasElement.clientWidth,
		);
	},
};

// Six segments that do not fit a phone's column keep their natural width: no
// label is cut, the track scrolls sideways (no scrollbar drawn), and the
// chosen segment is scrolled into view as the control mounts and as the
// choice changes, by a key too.
const FACETS = [
	{ value: "spec", label: "Spec" },
	{ value: "sends", label: "Sends" },
	{ value: "build", label: "Build" },
	{ value: "observed", label: "Observed" },
	{ value: "notes", label: "Notes" },
	{ value: "history", label: "History" },
];

function Facets({ initial }: { initial: string }) {
	const [facet, setFacet] = useState(initial);
	return (
		<div
			style={{ width: 390, height: 400 }}
			className="flex flex-col max-w-none"
		>
			<Place>
				<Pane title="Event">
					<Picker
						fit="segments"
						label="Facet"
						options={FACETS}
						value={facet}
						onChange={setFacet}
					/>
				</Pane>
			</Place>
		</div>
	);
}

const inView = (segment: HTMLElement, track: HTMLElement) => {
	const at = segment.getBoundingClientRect();
	const room = track.getBoundingClientRect();
	return at.left >= room.left - 0.5 && at.right <= room.right + 0.5;
};

export const ScrollsInsteadOfCuttingLabelsAt390: StoryObj = {
	render: () => <Facets initial="history" />,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvas, canvasElement, userEvent }) => {
		await document.fonts.ready;
		const group = canvas.getByRole("radiogroup", { name: "Facet" });
		const radios = canvas.getAllByRole("radio");
		// No label is cut.
		for (const radio of radios) {
			const label = radio.lastElementChild as HTMLElement;
			await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
		}
		// The track scrolls sideways, held to its column, and draws no scrollbar.
		await expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
		await expect(getComputedStyle(group).overflowX).toBe("auto");
		await expect(group.offsetHeight).toBe(group.clientHeight);
		await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
			canvasElement.clientWidth,
		);
		// The chosen segment, the last, is in view on mount.
		const [chosen] = canvas.getAllByRole("radio", { checked: true });
		await expect(chosen).toHaveTextContent("History");
		await expect(group.scrollLeft).toBeGreaterThan(0);
		await waitFor(() =>
			expect(inView(chosen as HTMLElement, group)).toBe(true),
		);
		// A choice back at the start scrolls the first segment into view, and the
		// arrow keys keep the radio group's order.
		const [spec, sends] = radios;
		await userEvent.click(spec as HTMLElement);
		await waitFor(() => expect(spec).toBeChecked());
		await waitFor(() => expect(inView(spec as HTMLElement, group)).toBe(true));
		await expect(group.scrollLeft).toBe(0);
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(sends).toBeChecked());
		await expect(sends).toHaveFocus();
		// Wrapping to the last segment from the first by a key scrolls it in.
		await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
		await waitFor(() => expect(radios.at(-1)).toBeChecked());
		await expect(radios.at(-1)).toHaveFocus();
		await waitFor(() =>
			expect(inView(radios.at(-1) as HTMLElement, group)).toBe(true),
		);
	},
};

// Segments that fit are as they were: the track hugs them and does not scroll.
export const FittingSegmentsDoNotScroll: StoryObj = {
	render: () => <Views />,
	play: async ({ canvas }) => {
		const group = canvas.getByRole("radiogroup", { name: "View" });
		await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
		await expect(group.scrollLeft).toBe(0);
	},
};

// A track in a Pane's body, above content that overflows the body (the body is a
// column that scrolls), keeps its segments' height: a track that scrolls
// sideways has no automatic minimum height, so it must not shrink with the
// column.
function Overfull() {
	const [view, setView] = useState("list");
	return (
		<div
			style={{ width: 640, height: 300 }}
			className="flex flex-col max-w-none"
		>
			<Place>
				<Pane title="Page">
					<Picker
						fit="segments"
						label="Section"
						options={VIEWS}
						value={view}
						onChange={setView}
					/>
					<div style={{ height: 1200 }} className="shrink-0">
						A tall facet
					</div>
				</Pane>
			</Place>
		</div>
	);
}

export const TrackKeepsItsHeightInAScrollingBody: StoryObj = {
	render: () => <Overfull />,
	play: async ({ canvas }) => {
		await document.fonts.ready;
		const group = canvas.getByRole("radiogroup", { name: "Section" });
		const [first] = canvas.getAllByRole("radio");
		const body = group.parentElement as HTMLElement;
		await waitFor(() =>
			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight),
		);
		await expect(group.getBoundingClientRect().height).toBeGreaterThanOrEqual(
			(first as HTMLElement).getBoundingClientRect().height,
		);
		await expect(group.getBoundingClientRect().height).toBeGreaterThan(0);
	},
};

const SECTIONS = [
	{ label: "Organization", href: "/acme/settings" },
	{ label: "Members", href: "/acme/settings/members" },
	{ label: "Portal", href: "/acme/settings/portal" },
];

// Options with an `href` and no value are links, the tabs of a place: the one
// whose href is the location's path or its nearest parent is the current page
// (a section's own tab stays marked below it, the longest href winning), and
// none is while the location is elsewhere.
export const LinksMarkTheLocation: StoryObj = {
	render: () => <Picker fit="segments" options={SECTIONS} />,
	play: async ({ canvas }) => {
		const was = location.href;
		const at = async (path: string) => {
			history.replaceState(null, "", path);
			dispatchEvent(new PopStateEvent("popstate"));
			await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(3));
		};
		try {
			await at("/acme/settings/members/ada");
			const [organization, members, portal] = canvas.getAllByRole("link");
			await waitFor(() =>
				expect(members).toHaveAttribute("aria-current", "page"),
			);
			await expect(organization).not.toHaveAttribute("aria-current");
			await expect(portal).not.toHaveAttribute("aria-current");
			await at("/acme/settings?tab=1");
			await waitFor(() =>
				expect(organization).toHaveAttribute("aria-current", "page"),
			);
			await expect(members).not.toHaveAttribute("aria-current");
			await at("/acme/inventory");
			await waitFor(() =>
				expect(organization).not.toHaveAttribute("aria-current"),
			);
		} finally {
			history.replaceState(null, "", was);
		}
	},
};
