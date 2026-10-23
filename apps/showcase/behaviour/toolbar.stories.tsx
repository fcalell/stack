import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { focused, walked } from "./support.ts";

const pressed = fn();

// A toolbar given its filters as data draws two or fewer as picks and folds three or
// more behind one Filters act, a removable chip for each one set.
//
// A toolbar in a Pane's body stands at the body's own inset, under the heading
// of the section that follows it, not a page inset past it; its search grows
// beside its acts on one line while they fit, and on touch the search takes a
// line of its own over the acts, which wrap in rows each inside the toolbar
// range.
export default {
	title: "Behaviour/Toolbar",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const SOURCES = [
	{ value: "all", label: "All sources" },
	{ value: "sitemap", label: "Fixture sitemap" },
];
const KINDS = [
	{ value: "all", label: "All kinds" },
	{ value: "page", label: "Page" },
];

function Strip(props: { width: number; filter?: boolean }) {
	// Unset, a pick reads its label alone ("Source"); set it reads "Source:
	// All sources", which a 488 px body does not hold beside the search.
	const [source, setSource] = useState<string>();
	const [kind, setKind] = useState<string>();
	return (
		<div style={{ width: props.width, height: 500 }} className="flex flex-col">
			<Place>
				<Pane title="Inventory">
					<Toolbar
						search={{ value: "", onChange: () => {}, placeholder: "Search" }}
					>
						<Picker
							label="Source"
							options={SOURCES}
							value={source}
							onChange={setSource}
						/>
						<Picker
							label="Kind"
							options={KINDS}
							value={kind}
							onChange={setKind}
						/>
						{props.filter ? (
							<Button act="secondary" label="Filter" onAct={pressed} />
						) : null}
					</Toolbar>
					<Section title="Items">
						<p>Rows.</p>
					</Section>
				</Pane>
			</Place>
		</div>
	);
}

const must = <T extends Element>(element: T | null | undefined): T => {
	if (!element) throw new Error("the element is not drawn");
	return element;
};

// The strip, its controls and the heading under it, measured.
function parts(canvasElement: HTMLElement) {
	const input = must(canvasElement.querySelector("input"));
	const strip = must(input.closest("div.border-b"));
	// The search box: the first of the strip's row.
	const search = must(strip.firstElementChild?.firstElementChild);
	const picks = [
		...canvasElement.querySelectorAll("button[aria-label]"),
	].filter((button) =>
		/Source|Kind/.test(button.getAttribute("aria-label") ?? ""),
	);
	const heading = must(canvasElement.querySelector("h2"));
	return { search, picks, strip, heading };
}

export const SearchSharesALineWithItsActs: StoryObj = {
	render: () => <Strip width={1280} />,
	play: async ({ canvasElement }) => {
		await document.fonts.ready;
		const { search, picks, strip, heading } = parts(canvasElement);
		const band = strip.getBoundingClientRect();
		// One line inside the toolbar range (36 to 48).
		await expect(band.height).toBeLessThanOrEqual(48);
		const field = search.getBoundingClientRect();
		for (const pick of picks)
			await expect(
				Math.abs(pick.getBoundingClientRect().top - field.top),
			).toBeLessThan(2);
		// The controls start where the section's heading does.
		await expect(field.left).toBeCloseTo(
			heading.getBoundingClientRect().left,
			0,
		);
		await expect(band.left).toBeCloseTo(
			heading.getBoundingClientRect().left,
			0,
		);
	},
};

export const TouchWrapsInRowsAtTheBodyInset: StoryObj = {
	render: () => <Strip width={320} filter />,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		await document.fonts.ready;
		const { search, picks, strip, heading } = parts(canvasElement);
		const left = heading.getBoundingClientRect().left;
		await expect(search.getBoundingClientRect().left).toBeCloseTo(left, 0);
		// The search stands alone on its line, the acts under it.
		for (const pick of picks)
			await expect(pick.getBoundingClientRect().top).toBeGreaterThan(
				search.getBoundingClientRect().bottom - 1,
			);
		// Each row of controls is inside the toolbar range.
		for (const control of [search, ...picks])
			await expect(control.getBoundingClientRect().height).toBeLessThanOrEqual(
				48,
			);
		await expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
	},
};

const TYPES = [
	{ value: null, label: "All types" },
	{ value: "new", label: "New" },
	{ value: "change", label: "Change" },
	{ value: "fix", label: "Fix" },
];
const STATUSES = [
	{ value: "open", label: "Open" },
	{ value: "closed", label: "Closed" },
];
const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
];
const AREAS = [
	{ value: "tagging", label: "Tagging" },
	{ value: "analytics", label: "Analytics" },
];
const PROJECTS = [
	{ value: "shop", label: "Shop" },
	{ value: "docs", label: "Docs" },
	{ value: "app", label: "App" },
	{ value: "blog", label: "Blog" },
];

interface Held {
	type: string | null;
	status: string | null;
	owner: string | null;
	area: string | null;
	projects: string[];
}

const NONE: Held = {
	type: null,
	status: null,
	owner: null,
	area: null,
	projects: [],
};

// The requests list's filters, held as a screen holds them: `many` of the five
// (the first two when fewer), each the viewer's pick applied at once.
function Requests(props: {
	width: number;
	many: 2 | 5;
	start?: Partial<Held>;
}) {
	const [held, setHeld] = useState<Held>({ ...NONE, ...props.start });
	const one =
		(key: Exclude<keyof Held, "projects">) => (value: string | null) =>
			setHeld((was) => ({ ...was, [key]: value }));
	const all = [
		{
			label: "Work type",
			options: TYPES,
			value: held.type,
			onChange: one("type"),
		},
		{
			label: "Status",
			options: STATUSES,
			value: held.status,
			onChange: one("status"),
		},
		{
			label: "Owner",
			options: OWNERS,
			value: held.owner,
			onChange: one("owner"),
		},
		{
			label: "Area",
			options: AREAS,
			value: held.area,
			onChange: one("area"),
		},
		{
			several: true as const,
			label: "Projects",
			options: PROJECTS,
			value: held.projects,
			onChange: (projects: string[]) =>
				setHeld((was) => ({ ...was, projects })),
		},
	];
	return (
		<div style={{ width: props.width, height: 560 }} className="flex flex-col">
			<Place>
				<Pane title="Requests">
					<Toolbar
						search={{ value: "", onChange: () => {}, placeholder: "Search" }}
						filters={all.slice(0, props.many)}
					/>
					<Section title="Items">
						<p>Rows.</p>
					</Section>
				</Pane>
			</Place>
			<output data-held>{JSON.stringify(held)}</output>
		</div>
	);
}

// What the screen holds, read off the story.
const heldIn = (canvasElement: HTMLElement): Held =>
	JSON.parse(
		must(canvasElement.querySelector("output[data-held]")).textContent,
	);

const strip = (canvasElement: HTMLElement) =>
	must(
		must(canvasElement.querySelector("input")).closest("div.border-b"),
	) as HTMLElement;

// The Filters act, with its count once any filter is set.
const act = (scope: HTMLElement) =>
	within(scope).getByRole("button", { name: /^Filters/ });

// Picks an option of one of the folded filters, open: the pick's own list
// opens over the popover (a button on touch, which opens its own sheet over the filters' one), a pick of one closes it and a pick of
// several leaves it open.
async function pick(
	user: { click: (element: Element) => Promise<void> },
	field: string,
	option: string,
	role: "combobox" | "button" = "combobox",
) {
	const dialog = await screen.findByRole("dialog", { name: /Filters/ });
	await user.click(within(dialog).getByRole(role, { name: field }));
	await user.click(await screen.findByRole("option", { name: option }));
}

// Two filters or fewer stand beside the search as picks: a set one reads its
// label and its value, one unset or on its `null` option its label alone.
export const TwoFiltersStandInline: StoryObj = {
	render: () => <Requests width={1280} many={2} start={{ status: "open" }} />,
	play: async ({ canvasElement, userEvent }) => {
		await document.fonts.ready;
		const bar = within(strip(canvasElement));
		await expect(bar.queryByRole("button", { name: /^Filters/ })).toBeNull();
		const type = bar.getByRole("combobox", { name: "Work type" });
		await expect(type).toHaveTextContent(/^Work type$/);
		await expect(
			bar.getByRole("combobox", { name: "Status" }),
		).toHaveTextContent("Status: Open");
		await userEvent.click(type);
		await userEvent.click(
			await screen.findByRole("option", { name: "Change" }),
		);
		await waitFor(() => expect(type).toHaveTextContent("Work type: Change"));
		// The empty choice reads the label alone again, and no chip stands for a filter.
		await userEvent.click(type);
		await userEvent.click(
			await screen.findByRole("option", { name: "All types" }),
		);
		await waitFor(() => expect(type).toHaveTextContent(/^Work type$/));
		await expect(bar.queryByRole("button", { name: /^Remove/ })).toBeNull();
	},
};

// Three filters or more fold, all of them: one outlined act, no pick inline.
export const ThreeOrMoreFoldToOneAct: StoryObj = {
	render: () => <Requests width={1280} many={5} />,
	play: async ({ canvasElement }) => {
		await document.fonts.ready;
		const bar = within(strip(canvasElement));
		const filters = act(strip(canvasElement));
		await expect(filters).toHaveAttribute("aria-haspopup", "dialog");
		await expect(bar.queryAllByRole("combobox")).toHaveLength(0);
		// Nothing is set, so no count and no chip.
		await expect(filters).toHaveTextContent(/^Filters$/);
		await expect(bar.queryByRole("button", { name: /^Remove/ })).toBeNull();
		// One line: the search shares it with the act.
		await expect(
			strip(canvasElement).getBoundingClientRect().height,
		).toBeLessThanOrEqual(48);
	},
};

// The popover hangs from the act's start edge at the filters pattern's width
// (300 to 500), the labelled picks inside it apply as they are picked, the
// count follows the set filters and Escape returns focus to the act.
export const PopoverAppliesAtOnce: StoryObj = {
	render: () => <Requests width={1280} many={5} />,
	play: async ({ canvasElement, userEvent }) => {
		await document.fonts.ready;
		const filters = act(strip(canvasElement));
		await userEvent.click(filters);
		const dialog = await screen.findByRole("dialog", { name: /Filters/ });
		const box = dialog.getBoundingClientRect();
		const trigger = filters.getBoundingClientRect();
		await expect(box.width).toBeGreaterThanOrEqual(300);
		await expect(box.width).toBeLessThanOrEqual(500);
		await expect(Math.abs(box.left - trigger.left)).toBeLessThan(2);
		await expect(box.top).toBeGreaterThanOrEqual(trigger.bottom);
		// Every filter is a labelled pick; none set, so no clear act.
		for (const name of ["Work type", "Status", "Owner", "Area", "Projects"])
			await within(dialog).getByRole("combobox", { name });
		await expect(
			within(dialog).queryByRole("button", { name: "Clear filters" }),
		).toBeNull();
		await pick(userEvent, "Work type", "Change");
		await waitFor(() => expect(heldIn(canvasElement).type).toBe("change"));
		await waitFor(() => expect(filters).toHaveTextContent("Filters1"));
		await expect(await walked()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(filters).toHaveFocus());
		// A press outside closes it as well, focus back on the act.
		await userEvent.click(filters);
		await screen.findByRole("dialog", { name: /Filters/ });
		await userEvent.click(canvasElement.querySelector("h2") as Element);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(filters).toHaveFocus());
	},
};

// Each set filter shows as a chip before anything else, "Work type: Change", a
// pick of several by its count ("Projects: 3 projects") or its one value; the
// chip's remove sets the filter to its empty value and the count follows.
export const ChipsNameEachSetFilter: StoryObj = {
	render: () => (
		<Requests
			width={1280}
			many={5}
			start={{
				type: "change",
				status: "open",
				projects: ["shop", "docs", "app"],
			}}
		/>
	),
	play: async ({ canvasElement, userEvent }) => {
		await document.fonts.ready;
		const bar = within(strip(canvasElement));
		const filters = act(strip(canvasElement));
		await expect(filters).toHaveTextContent("Filters3");
		for (const chip of [
			"Work type: Change",
			"Status: Open",
			"Projects: 3 projects",
		])
			await bar.findByRole("button", { name: `Remove ${chip}` });
		// Unset filters have no chip.
		await expect(
			bar.queryByRole("button", { name: /Remove Owner/ }),
		).toBeNull();
		await userEvent.click(
			bar.getByRole("button", { name: "Remove Status: Open" }),
		);
		await waitFor(() => expect(heldIn(canvasElement).status).toBeNull());
		await waitFor(() => expect(filters).toHaveTextContent("Filters2"));
		await expect(
			bar.queryByRole("button", { name: "Remove Status: Open" }),
		).toBeNull();
		// A pick of several is removed to `[]`, and one value reads as itself.
		await userEvent.click(
			bar.getByRole("button", { name: "Remove Projects: 3 projects" }),
		);
		await waitFor(() => expect(heldIn(canvasElement).projects).toEqual([]));
		await waitFor(() => expect(filters).toHaveTextContent("Filters1"));
		await userEvent.click(filters);
		await pick(userEvent, "Projects", "Shop");
		await bar.findByRole("button", { name: "Remove Projects: Shop" });
		await expect(await walked()).toEqual([]);
	},
};

// Clear filters stands while any is set and sets every one to its empty value;
// the chips and the count go with them and focus stays inside the popover.
export const ClearFiltersSetsEveryFilterEmpty: StoryObj = {
	render: () => (
		<Requests
			width={1280}
			many={5}
			start={{ type: "fix", owner: "ben", projects: ["blog"] }}
		/>
	),
	play: async ({ canvasElement, userEvent }) => {
		await document.fonts.ready;
		const filters = act(strip(canvasElement));
		await userEvent.click(filters);
		const dialog = await screen.findByRole("dialog", { name: /Filters/ });
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Clear filters" }),
		);
		await waitFor(() => expect(heldIn(canvasElement)).toEqual(NONE));
		await waitFor(() => expect(filters).toHaveTextContent(/^Filters$/));
		await waitFor(() =>
			expect(
				within(dialog).queryByRole("button", { name: "Clear filters" }),
			).toBeNull(),
		);
		await expect(
			within(strip(canvasElement)).queryByRole("button", { name: /^Remove/ }),
		).toBeNull();
		await expect(dialog).toContainElement(focused());
	},
};

// On touch the Filters act opens a bottom sheet of the same picks, at 320 px
// with nothing scrolling sideways; Escape closes it and focus returns to the act.
export const TouchOpensASheet: StoryObj = {
	render: () => (
		<Requests
			width={320}
			many={5}
			start={{ type: "change", projects: ["shop"] }}
		/>
	),
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvasElement, userEvent }) => {
		await document.fonts.ready;
		const bar = strip(canvasElement);
		const filters = act(bar);
		// Nothing scrolls sideways: no box around the strip is wider than it
		// shows (a remove act's hit box reaches a pixel past a chip at a line's
		// end, which the strip's visible overflow lets through).
		for (let up = bar.parentElement; up; up = up.parentElement)
			await expect(up.scrollWidth).toBeLessThanOrEqual(up.clientWidth);
		await expect(filters.getBoundingClientRect().height).toBeLessThanOrEqual(
			48,
		);
		for (const remove of within(bar).getAllByRole("button", {
			name: /^Remove/,
		}))
			await expect(
				(remove.parentElement as HTMLElement).getBoundingClientRect().right,
			).toBeLessThanOrEqual(bar.getBoundingClientRect().right);
		await userEvent.click(filters);
		const sheet = await screen.findByRole("dialog", { name: /Filters/ });
		await waitFor(() =>
			expect(Math.round(sheet.getBoundingClientRect().bottom)).toBe(
				window.innerHeight,
			),
		);
		await expect(sheet.scrollWidth).toBeLessThanOrEqual(sheet.clientWidth);
		for (const name of ["Work type", "Status", "Owner", "Area", "Projects"])
			within(sheet).getByRole("button", { name });
		await pick(userEvent, "Status", "Open", "button");
		await waitFor(() => expect(heldIn(canvasElement).status).toBe("open"));
		await expect(await walked()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(filters).toHaveFocus());
	},
};

// The tab strip is a navigation landmark named by the `tabs` word, so the tabs
// of a list stand as a place's sections to assistive technology.
export const TabsAreANamedNavigation: StoryObj = {
	render: () => (
		<Place>
			<Pane title="Settings" wide>
				<Toolbar
					tabs={[
						{ label: "Organization", href: "/acme/settings" },
						{ label: "Members", href: "/acme/settings/members" },
					]}
				/>
			</Pane>
		</Place>
	),
	play: async ({ canvas }) => {
		const nav = canvas.getByRole("navigation", { name: "Sections" });
		await expect(within(nav).getAllByRole("link")).toHaveLength(2);
	},
};
