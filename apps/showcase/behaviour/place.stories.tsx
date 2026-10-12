import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { focused } from "./support.ts";

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];
const ROWS = {
	key: (name: string) => name,
	title: (name: string) => name,
};
const noop = () => {};

export default { title: "Behaviour/Place" } satisfies Meta;

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
		tags: ["touch"],
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
					<List items={NAMES} row={ROWS} />
				</Pane>
				<Pane title="Review" back="/reviews">
					<Section title="Activity">
						<List items={NAMES} row={ROWS} />
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

export const OnlyTheLastPaneAtThePhone = touch({
	render: () => <Opened width={375} />,
	play: async ({ canvasElement }) => {
		const [list, record] = panes(canvasElement);
		await expect(shown(list)).toBe(false);
		await expect(shown(record)).toBe(true);
		const heads = [...canvasElement.querySelectorAll("header")].filter((head) =>
			head.checkVisibility(),
		);
		await expect(heads).toHaveLength(1);
	},
});

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

// The list loads and its rows arrive: the Panes keep their edges.
function Loads() {
	const [rows, setRows] = useState<string[] | undefined>(undefined);
	return (
		<Page width={1440}>
			<Place>
				<Pane title="Reviews">
					{rows ? (
						<List items={rows} row={ROWS} />
					) : (
						<List items={[]} loading row={ROWS} />
					)}
				</Pane>
				<Pane title="Review" back="/reviews">
					<button
						type="button"
						onClick={() =>
							setRows(["Review the deploy of the billing service"])
						}
					>
						Load
					</button>
					<button type="button" onClick={() => setRows(NAMES)}>
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
		const edges = () => {
			const [list, record] = panes(canvasElement);
			return [
				must(list).getBoundingClientRect().width,
				must(record).getBoundingClientRect().left,
			];
		};
		const loading = edges();
		await expect(loading[0]).toBeCloseTo(width(canvasElement, "w-list"), 0);
		await userEvent.click(canvas.getByRole("button", { name: "Load" }));
		await expect(canvas.getByText(/Review the deploy of/)).toBeVisible();
		await expect(edges()).toEqual(loading);
		await userEvent.click(canvas.getByRole("button", { name: "Load short" }));
		await expect(canvas.getByText("Ana Ruiz")).toBeVisible();
		await expect(edges()).toEqual(loading);
	},
};

// A covering Pane hides the Panes before it and keeps them mounted: what was
// typed in one survives the cover and its return, the hidden Panes out of the
// tab order meanwhile.
function Covered() {
	const [covering, setCovering] = useState(false);
	const [typed, setTyped] = useState("");
	return (
		<Page width={1280}>
			<Place>
				<Pane title="Reviews">
					<List items={NAMES} row={ROWS} />
				</Pane>
				<Pane title="Review" back="/reviews">
					<FormField label="Note">
						<Input value={typed} onChange={setTyped} />
					</FormField>
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

export const RecordGoesBackAtThePhone = touch({
	render: () => <Opened width={375} />,
	play: async ({ canvasElement }) => {
		await expect(visible(canvasElement, "Back")).toEqual(["/reviews"]);
		await expect(visible(canvasElement, "Close")).toEqual([]);
	},
});

export const CoverGoesBackWhereverItStands: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane title="Reviews">
					<List items={NAMES} row={ROWS} />
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
					<List items={NAMES} row={ROWS} />
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
					<List
						items={ITEMS}
						row={{
							key: (name: string) => name,
							title: (name: string) => name,
							onOpen: (name: string) => setOpen(name),
						}}
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
