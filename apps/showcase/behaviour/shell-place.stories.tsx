import { read, useQueryClient } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { focused } from "./support.ts";

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];
const toRow = (name: string): Row => ({ key: name, title: name });
const noop = () => {};

export default { title: "Behaviour/Shell place" } satisfies Meta;

// A page `width` px wide: the container its Panes query.
function Page(props: { width: number; children: ReactNode }) {
	return (
		<div
			style={{
				width: props.width,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{props.children}
		</div>
	);
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

// The Panes of the place, in order.
function panes(canvasElement: HTMLElement): HTMLElement[] {
	return [...canvasElement.querySelectorAll<HTMLElement>("section[data-page]")];
}

const shown = (el: Element | undefined) =>
	el !== undefined && getComputedStyle(el).display !== "none";

// A token's width in px, read off a probe wearing its class.
function width(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = probe.getBoundingClientRect().width;
	probe.remove();
	return size;
}

function touch(story: StoryObj): StoryObj {
	return {
		...story,
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			...story.parameters,
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
}

// A list and the record it opened: two Panes, the record's back the list.
function Opened(props: { width: number }) {
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Reviews">
					<Section items={NAMES.map(toRow)} />
				</Pane>
				<Pane title="Review" back="/reviews">
					<Section title="Activity">
						<Section items={NAMES.map(toRow)} />
					</Section>
				</Pane>
			</Place>
		</Page>
	);
}

// From `tablet` of the Place every Pane stands; below it only the last does,
// and the Panes before it stay mounted.
export const PanesStandFromTablet: StoryObj = {
	render: () => <Opened width={BREAKPOINT_PX.tablet} />,
	play: async ({ canvasElement }) => {
		const [list, record] = panes(canvasElement);
		await expect(shown(list)).toBe(true);
		await expect(shown(record)).toBe(true);
	},
};

export const OnlyTheLastPaneBelowTablet: StoryObj = {
	render: () => <Opened width={BREAKPOINT_PX.tablet - 1} />,
	play: async ({ canvasElement }) => {
		const [list, record] = panes(canvasElement);
		await expect(shown(list)).toBe(false);
		await expect(shown(record)).toBe(true);
		await expect(must(list).isConnected).toBe(true);
	},
};

export const OnlyTheLastPaneAtThePhone = {
	...touch({
		render: () => <Opened width={375} />,
		play: async ({ canvasElement }) => {
			const [list, record] = panes(canvasElement);
			await expect(shown(list)).toBe(false);
			await expect(shown(record)).toBe(true);
			const heads = [...canvasElement.querySelectorAll("header")].filter(
				(head) => head.checkVisibility(),
			);
			await expect(heads).toHaveLength(1);
		},
	}),
	tags: ["touch"],
};

// A Sheet the page draws in its Place, open, leaves the modal's focus guards
// after the last Pane (the Shell mounts its popups elsewhere in `main`): the
// last Pane still stands at the phone and still takes the rest beside the list.
const PLACES: PlaceSpec[] = [
	{ route: "/reviews", label: "Reviews", icon: "House" },
];

function SheetOver() {
	return (
		<Shell places={PLACES}>
			<Pane title="Reviews">
				<Section items={NAMES.map(toRow)} />
			</Pane>
			<Pane title="Review" back="/reviews">
				<p>The record.</p>
			</Pane>
			<Sheet open onClose={noop} title="Problems">
				<p>Body</p>
			</Sheet>
		</Shell>
	);
}

const opened = () =>
	waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());

export const AnOpenSheetKeepsTheLastPaneAtThePhone = {
	...touch({
		render: () => <SheetOver />,
		parameters: { layout: "fullscreen" },
		play: async ({ canvasElement }) => {
			await opened();
			const [list, record] = panes(canvasElement);
			await expect(shown(list)).toBe(false);
			await expect(shown(record)).toBe(true);
		},
	}),
	tags: ["touch"],
};

export const AnOpenSheetKeepsTheLastPaneTakingTheRest: StoryObj = {
	render: () => <SheetOver />,
	parameters: {
		layout: "fullscreen",
		viewport: {
			options: {
				desktop: {
					name: "Desktop",
					styles: { width: "1440px", height: "900px" },
					type: "desktop",
				},
			},
		},
	},
	globals: { viewport: { value: "desktop", isRotated: false } },
	play: async ({ canvasElement }) => {
		await opened();
		const [list, record] = panes(canvasElement);
		await expect(shown(list)).toBe(true);
		await expect(must(record).getBoundingClientRect().right).toBeCloseTo(
			must(must(list).parentElement).getBoundingClientRect().right,
			0,
		);
	},
};

// A Pane before the last holds the list width whatever its rows are; the last
// takes the rest.
export const ListPaneHoldsTheListWidth: StoryObj = {
	render: () => <Opened width={1440} />,
	play: async ({ canvasElement }) => {
		const [list, record] = panes(canvasElement);
		const box = must(list).getBoundingClientRect();
		await expect(box.width).toBeCloseTo(width(canvasElement, "w-list"), 0);
		const next = must(record).getBoundingClientRect();
		await expect(next.left).toBeCloseTo(box.right, 0);
		await expect(next.right).toBeCloseTo(
			must(must(list).parentElement).getBoundingClientRect().right,
			0,
		);
	},
};

// The list loads and its rows arrive: the Panes keep their edges. The list's
// read never answers until a button lands its rows in the cache.
let lists = 0;
function Loads() {
	const queries = useQueryClient();
	const [rows] = useState(() =>
		read({
			queryKey: ["place", "reviews", lists++],
			queryFn: () => new Promise<readonly string[]>(() => {}),
			staleTime: Number.POSITIVE_INFINITY,
		}),
	);
	const land = (next: readonly string[]) =>
		queries.setQueryData(rows.options.queryKey, next);
	return (
		<Page width={1440}>
			<Place>
				<Pane title="Reviews" read={rows}>
					<Section items={rows.at((names) => names.map(toRow))} />
				</Pane>
				<Pane title="Review" back="/reviews">
					<button
						type="button"
						onClick={() => land(["Review the deploy of the billing service"])}
					>
						Load
					</button>
					<button type="button" onClick={() => land(NAMES)}>
						Load short
					</button>
				</Pane>
			</Place>
		</Page>
	);
}

export const ListPaneHoldsItsWidthWhileLoading: StoryObj = {
	render: () => <Loads />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		// Read against the Place: the page is wider than the viewport, so the
		// document may scroll sideways under a click.
		const edges = () => {
			const [list, record] = panes(canvasElement);
			const place = must(must(list).parentElement).getBoundingClientRect();
			return [
				must(list).getBoundingClientRect().width,
				must(record).getBoundingClientRect().left - place.left,
			];
		};
		const loading = edges();
		await expect(loading[0]).toBeCloseTo(width(canvasElement, "w-list"), 0);
		await userEvent.click(canvas.getByRole("button", { name: "Load" }));
		await expect(await canvas.findByText(/Review the deploy of/)).toBeVisible();
		await expect(edges()).toEqual(loading);
		await userEvent.click(canvas.getByRole("button", { name: "Load short" }));
		// Rows that arrive once the list is drawn fade in on `base`.
		await waitFor(() => expect(canvas.getByText("Ana Ruiz")).toBeVisible());
		await expect(edges()).toEqual(loading);
	},
};

// A covering Pane hides the Panes before it and keeps them mounted: what was
// typed in one survives the cover and its return, the hidden Panes out of the
// tab order meanwhile.
function Covered() {
	const [covering, setCovering] = useState(false);
	return (
		<Page width={1280}>
			<Place>
				<Pane title="Reviews">
					<Section items={NAMES.map(toRow)} />
				</Pane>
				<Pane title="Review" back="/reviews">
					<Form
						act={orpc.forms.rename}
						given={{ workspaceId: "acme" }}
						fields={{ name: { label: "Note" } }}
					/>
					<button type="button" onClick={() => setCovering(true)}>
						Push
					</button>
				</Pane>
				{covering ? (
					<Pane title="Add a repo" back="/review" cover>
						<button type="button" onClick={() => setCovering(false)}>
							Pop
						</button>
					</Pane>
				) : null}
			</Place>
		</Page>
	);
}

export const CoverHidesThePanesBeforeItAndKeepsThemMounted: StoryObj = {
	render: () => <Covered />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const field = canvas.getByRole("textbox", { name: "Note" });
		await userEvent.type(field, "kept");
		await expect(panes(canvasElement)).toHaveLength(2);
		await userEvent.click(canvas.getByRole("button", { name: "Push" }));
		const [list, record, cover] = panes(canvasElement) as [
			HTMLElement,
			HTMLElement,
			HTMLElement,
		];
		await expect(shown(list)).toBe(false);
		await expect(shown(record)).toBe(false);
		await expect(shown(cover)).toBe(true);
		// The cover spans the Place.
		await expect(must(cover).getBoundingClientRect().width).toBeCloseTo(
			must(cover.parentElement).getBoundingClientRect().width,
			0,
		);
		// Mounted: the same field, its text, out of sight and out of reach.
		await expect(field.isConnected).toBe(true);
		await expect(field).toHaveValue("kept");
		await expect(field.checkVisibility()).toBe(false);
		await userEvent.click(canvas.getByRole("button", { name: "Pop" }));
		await waitFor(() => expect(panes(canvasElement)).toHaveLength(2));
		await expect(shown(panes(canvasElement)[1])).toBe(true);
		await expect(canvas.getByRole("textbox", { name: "Note" })).toBe(field);
		await expect(field).toHaveValue("kept");
	},
};

// The back act reads Back where its Pane stands alone (below `tablet`, first
// in the Place, or covering it) and Close where a Pane stands before it.
const visible = (root: Element, label: string) =>
	[...root.querySelectorAll<HTMLElement>(`a[aria-label='${label}']`)]
		.filter((el) => el.checkVisibility())
		.map((el) => el.getAttribute("href"));

export const RecordClosesBesideTheList: StoryObj = {
	render: () => <Opened width={1280} />,
	play: async ({ canvasElement }) => {
		await expect(visible(canvasElement, "Close")).toEqual(["/reviews"]);
		await expect(visible(canvasElement, "Back")).toEqual([]);
	},
};

export const RecordGoesBackBelowTablet: StoryObj = {
	render: () => <Opened width={BREAKPOINT_PX.tablet - 1} />,
	play: async ({ canvasElement }) => {
		await expect(visible(canvasElement, "Back")).toEqual(["/reviews"]);
		await expect(visible(canvasElement, "Close")).toEqual([]);
	},
};

export const RecordGoesBackAtThePhone = {
	...touch({
		render: () => <Opened width={375} />,
		play: async ({ canvasElement }) => {
			await expect(visible(canvasElement, "Back")).toEqual(["/reviews"]);
			await expect(visible(canvasElement, "Close")).toEqual([]);
		},
	}),
	tags: ["touch"],
};

export const CoverGoesBackWhereverItStands: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane title="Reviews">
					<Section items={NAMES.map(toRow)} />
				</Pane>
				<Pane title="Add a repo" back="/reviews" cover>
					<p>The form.</p>
				</Pane>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		await expect(visible(canvasElement, "Back")).toEqual(["/reviews"]);
		await expect(visible(canvasElement, "Close")).toEqual([]);
	},
};

export const FirstPaneWithABackGoesBack: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane title="Knowledge" back="/repos/x">
					<Section items={NAMES.map(toRow)} />
				</Pane>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		await expect(visible(canvasElement, "Back")).toEqual(["/repos/x"]);
		await expect(visible(canvasElement, "Close")).toEqual([]);
	},
};

const ITEMS = Array.from({ length: 44 }, (_, i) => `Item ${i + 1}`);

// A list whose row opens a record Pane after it.
function OpensARecord(props: { width: number }) {
	const [open, setOpen] = useState<string>();
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Now">
					<Section
						items={ITEMS.map((name) => ({
							key: name,
							title: name,
							onOpen: () => setOpen(name),
						}))}
					/>
				</Pane>
				{open === undefined ? null : (
					<Pane title={open} back="/now">
						<Section title="Activity">
							<button type="button" onClick={noop}>
								Approve
							</button>
						</Section>
					</Pane>
				)}
			</Place>
		</Page>
	);
}

// A row that opens a record Pane hands the keyboard to the new Pane's bar: the
// open lands on its first control (its Close or Back act), one Tab stop from
// the row, not the list's 44; Shift+Tab leaves it for the list, and walking
// the list without opening is as before.
function opensTheKeyboard(width: number): StoryObj {
	return {
		render: () => <OpensARecord width={width} />,
		play: async ({ canvas, canvasElement, userEvent }) => {
			const rows = canvas.getAllByRole("button", { name: /^Item \d+$/ });
			rows[0]?.focus();
			await userEvent.tab();
			await expect(rows[1]).toHaveFocus();
			await userEvent.keyboard("{Enter}");
			await waitFor(() => expect(panes(canvasElement)).toHaveLength(2));
			const record = must(panes(canvasElement)[1]);
			await waitFor(() => expect(record).toContainElement(focused()));
			await expect(must(record.querySelector("header"))).toContainElement(
				focused(),
			);
			const back = focused();
			await expect(back.getAttribute("aria-label")).toMatch(/^(Back|Close)$/);
			await expect(back.getAttribute("href")).toBe("/now");
			// Below `tablet` the list is hidden, so there is no Pane to return to.
			if (width < BREAKPOINT_PX.tablet) return;
			await userEvent.tab({ shift: true });
			await expect(must(panes(canvasElement)[0])).toContainElement(focused());
		},
	};
}

export const OpenTakesTheKeyboard1280 = opensTheKeyboard(1280);
export const OpenTakesTheKeyboard768 = opensTheKeyboard(768);
export const OpenTakesTheKeyboard700 = opensTheKeyboard(700);
