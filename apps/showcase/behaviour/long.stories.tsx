import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { WAIT_DELAY } from "@fcalell/ui-core/paint";
import { OVERSCAN, VIRTUAL_FROM } from "@fcalell/ui-core/window";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Profiler, type ReactNode, useMemo, useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

// A long collection draws only the rows near its scroller's view, from
// `VIRTUAL_FROM` loaded rows: the rows between stand as spacers, the focused
// row stays mounted, and crossing the count mounts nothing again. The `count`
// control sets how many rows the pages read answers with; the List, a Group's
// list and the Table's narrow list share one window.
interface Item {
	id: string;
	name: string;
}

const items = (from: number, count: number): Item[] =>
	Array.from({ length: count }, (_, at) => ({
		id: `r${from + at}`,
		name: `Row ${from + at}`,
	}));

// How many times the rows' slots ran: a render of the host runs one per item,
// so a scroll that costs none left the host and its rows alone.
const spy = { slots: 0, commits: 0 };

let made = 0;
// The first page is every row, a second page of five follows it.
function pages(count: number, ms?: number): Read<readonly Item[]> {
	return read<readonly Item[]>(
		{
			queryKey: ["long", made++],
			queryFn: async ({ pageParam }: { pageParam?: string }) => {
				if (ms) await new Promise((done) => setTimeout(done, ms));
				const at = Number(pageParam ?? 0);
				return {
					data: at === 0 ? items(1, count) : items(count + 1, 5),
					nextCursor: at === 0 ? "1" : null,
				};
			},
			initialPageParam: undefined,
			getNextPageParam: (last: { nextCursor: string | null }) =>
				last.nextCursor ?? undefined,
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		} as never,
		{ kind: "pages" },
	);
}

const ROW = {
	key: (each: Item) => each.id,
	title: (each: Item) => {
		spy.slots += 1;
		return each.name;
	},
	onOpen: () => {},
};
const COLUMNS: TableColumn<Item>[] = [
	{ key: "name", label: "Name", cell: (each) => each.name },
];

type Kind = "list" | "group" | "narrow";

function Rows(props: { kind: Kind; rows: Read<readonly Item[]> | Item[] }) {
	const { kind, rows } = props;
	if (kind === "group") return <Group list={{ items: rows, row: ROW }} />;
	if (kind === "narrow") {
		return (
			<Table
				columns={COLUMNS}
				items={rows}
				row={{ id: (each) => each.id }}
				onOpen={() => {}}
			/>
		);
	}
	return <List items={rows} row={ROW} />;
}

function Stage(props: { kind: Kind; children: ReactNode }) {
	return (
		<div
			style={{
				width: props.kind === "narrow" ? 375 : 900,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Long">{props.children}</Pane>
			</Place>
		</div>
	);
}

function Long(props: { kind: Kind; count: number; ms?: number }) {
	const { kind, count, ms } = props;
	const rows = useMemo(() => pages(count, ms), [count, ms]);
	return (
		<Stage kind={kind}>
			<Section title="Rows" read={rows}>
				<Profiler
					id="rows"
					onRender={() => {
						spy.commits += 1;
					}}
				>
					<Rows kind={kind} rows={rows} />
				</Profiler>
			</Section>
		</Stage>
	);
}

// The same rows as a constant that grows by a press: a collection crossing the
// count after a Show more.
function Growing(props: { kind: Kind; count: number }) {
	const [count, setCount] = useState(props.count);
	return (
		<Stage kind={props.kind}>
			<button type="button" onClick={() => setCount(count + 6)}>
				Grow
			</button>
			<Section title="Rows">
				<Rows kind={props.kind} rows={items(1, count)} />
			</Section>
		</Stage>
	);
}

// A console error naming flushSync, from the first render to the play's end.
const flush = { seen: [] as string[], restore: () => {} };

// The nearest ancestor that scrolls vertically.
function scrollerOf(node: HTMLElement): HTMLElement {
	for (let up = node.parentElement; up; up = up.parentElement) {
		if (getComputedStyle(up).overflowY === "auto") return up;
	}
	throw new Error("nothing scrolls around the rows");
}

// The mounted rows: the children of the rows' common box that hold a row.
function mounted(root: ParentNode): HTMLElement[] {
	const texts = [...root.querySelectorAll<HTMLElement>("*")].filter(
		(node) =>
			node.children.length === 0 && /^Row \d+$/.test(node.textContent ?? ""),
	);
	const [one, two] = texts;
	if (!one) return [];
	if (!two) return [one];
	let box = one.parentElement;
	while (box && !box.contains(two)) box = box.parentElement;
	return [...(box?.children ?? [])].filter((node): node is HTMLElement =>
		texts.some((text) => node.contains(text)),
	);
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));
async function frames(count = 3) {
	for (let at = 0; at < count; at++) await frame();
}

// The rows in the view; a row a gap's width outside it counts, as the window
// places by whole rows.
const inView = (nodes: HTMLElement[], view: HTMLElement) => {
	const box = view.getBoundingClientRect();
	const [one, two] = nodes.map((node) => node.getBoundingClientRect());
	const gap = one && two ? Math.max(0, two.top - one.bottom) : 0;
	return nodes.filter((node) => {
		const rect = node.getBoundingClientRect();
		return rect.bottom + gap >= box.top && rect.top - gap <= box.bottom;
	}).length;
};
// A row's name: its hit act's label.
const label = (node: Element) =>
	node.getAttribute("aria-label")?.match(/^Row \d+$/)?.[0];

export default {
	title: "Behaviour/Long",
	parameters: { layout: "fullscreen" },
	args: { count: 1000 },
	argTypes: { count: { control: { type: "number" } } },
	beforeEach: () => {
		flush.seen = [];
		spy.slots = 0;
		spy.commits = 0;
		const logged = console.error;
		console.error = (...args: unknown[]) => {
			if (args.some((one) => String(one).includes("flushSync")))
				flush.seen.push(args.map(String).join(" "));
			logged(...args);
		};
		flush.restore = () => {
			console.error = logged;
		};
	},
} satisfies Meta<{ count: number }>;

type Story = StoryObj<{ count: number }>;

// At 1000 rows the DOM holds the rows in view and `OVERSCAN` past each edge;
// the end shows the last row and the more row; a scroll renders the window and
// the rows entering it, not the host; the focused row stays mounted away from
// the view and Tab walks down the rows; no flushSync warning.
function windowed(kind: Kind): Story {
	return {
		render: ({ count }) => <Long kind={kind} count={count} />,
		play: async ({ canvas, canvasElement, userEvent, args }) => {
			try {
				await canvas.findByText("Row 1");
				const view = scrollerOf(await canvas.findByText("Row 1"));
				await frames();
				const bound = () => {
					const rows = mounted(canvasElement);
					const seen = inView(rows, view);
					if (rows.length > seen + 2 * OVERSCAN) {
						throw new Error(`${rows.length} rows mounted, ${seen} in view`);
					}
				};
				await waitFor(bound);
				await expect(mounted(canvasElement).length).toBeLessThan(
					args.count / 4,
				);

				// A scroll costs the host nothing: its slots do not run again, the
				// window renders, and the rows still mounted keep their nodes.
				const slots = spy.slots;
				const commits = spy.commits;
				const kept = mounted(canvasElement)[0];
				view.scrollTop = view.scrollHeight / 2;
				await frames(6);
				await expect(spy.slots).toBe(slots);
				await expect(spy.commits).toBeGreaterThan(commits);
				await expect(kept?.isConnected).toBe(false);
				await waitFor(bound);
				await expect(inView(mounted(canvasElement), view)).toBeGreaterThan(0);

				// The end shows the last row and the more row.
				await waitFor(
					async () => {
						view.scrollTop = view.scrollHeight;
						await frames(2);
						await canvas.findByText(`Row ${args.count}`);
						const more = canvas.getByRole("button", { name: "Show more" });
						const edge = view.getBoundingClientRect();
						await expect(
							more.getBoundingClientRect().bottom,
						).toBeLessThanOrEqual(edge.bottom + 1);
					},
					{ timeout: 5000 },
				);
				await waitFor(bound);

				// The focused row stays mounted when scrolled away, and Tab walks on.
				view.scrollTop = 0;
				await frames(4);
				// Past what stands before the rows (a table's sort pick).
				for (
					let at = 0;
					at < 6 && label(document.activeElement ?? view) !== "Row 1";
					at++
				) {
					await userEvent.tab();
				}
				await expect(
					label(focused()) ?? focused().outerHTML.slice(0, 300),
				).toBe("Row 1");
				for (let at = 2; at <= 40; at++) {
					// The scroll the last focus made mounts the row ahead on the next frame.
					await waitFor(() => {
						if (!view.querySelector(`[aria-label="Row ${at}"]`))
							throw new Error(
								`Row ${at} not mounted; mounted ${mounted(canvasElement).length}, last ${mounted(canvasElement).at(-1)?.textContent}, scrollTop ${view.scrollTop}/${view.scrollHeight}, focus ${label(document.activeElement ?? view)}`,
							);
					});
					await userEvent.tab();
					await expect(label(focused())).toBe(`Row ${at}`);
				}
				const row = focused();
				const rect = row.getBoundingClientRect();
				const edge = view.getBoundingClientRect();
				await expect(rect.bottom > edge.top && rect.top < edge.bottom).toBe(
					true,
				);
				view.scrollTop = view.scrollHeight / 2;
				await frames(6);
				await expect(row.isConnected).toBe(true);
				await expect(document.activeElement).toBe(row);
				await expect(
					mounted(canvasElement).some((each) => each.contains(row)),
				).toBe(true);
				// Tab walks on to the next mounted row, which the browser scrolls to.
				await userEvent.tab();
				await expect(Number(label(focused())?.slice(4))).toBeGreaterThan(40);
				await expect(flush.seen).toEqual([]);
			} finally {
				flush.restore();
			}
		},
	};
}

export const ListWindows = windowed("list");
export const GroupWindows = windowed("group");
export const TableNarrowWindows = windowed("narrow");

// 99 rows draw whole; 105 window, and the first row is the very node it was.
function crossing(kind: Kind): Story {
	return {
		args: { count: VIRTUAL_FROM - 1 },
		render: ({ count }) => <Growing kind={kind} count={count} />,
		play: async ({ canvas, canvasElement, userEvent }) => {
			try {
				const first = await canvas.findByText("Row 1");
				await expect(mounted(canvasElement).length).toBe(VIRTUAL_FROM - 1);
				await userEvent.click(canvas.getByRole("button", { name: "Grow" }));
				await waitFor(() =>
					expect(mounted(canvasElement).length).toBeLessThan(VIRTUAL_FROM),
				);
				await expect(canvas.getByText("Row 1")).toBe(first);
				await expect(first.isConnected).toBe(true);
				await expect(flush.seen).toEqual([]);
			} finally {
				flush.restore();
			}
		},
	};
}

export const ListCrossing = crossing("list");
export const GroupCrossing = crossing("group");
export const TableNarrowCrossing = crossing("narrow");

// A List in a sheet windows against the sheet's body, not the Pane under it.
export const InASheet: Story = {
	render: ({ count }) => (
		<Stage kind="list">
			<Sheet open onClose={() => {}} title="Rows">
				<List items={items(1, count)} row={ROW} />
			</Sheet>
		</Stage>
	),
	play: async ({ args }) => {
		try {
			const dialog = await screen.findByRole("dialog", { name: "Rows" });
			const first = await waitFor(() => {
				const one = [...dialog.querySelectorAll<HTMLElement>("*")].find(
					(node) => node.textContent === "Row 1" && node.children.length === 0,
				);
				if (!one) throw new Error("no first row");
				return one;
			});
			const view = scrollerOf(first);
			await expect(dialog).toContainElement(view);
			await frames();
			const rows = mounted(dialog);
			await expect(rows.length).toBeLessThan(args.count / 4);
			await expect(rows.length).toBeLessThanOrEqual(
				inView(rows, view) + 2 * OVERSCAN,
			);
			await expect(flush.seen).toEqual([]);
		} finally {
			flush.restore();
		}
	},
};

// The settle flips a 1000-row Section in one frame: no frame between the
// painted rows and the loaded ones holds neither, or both.
export const Settles: Story = {
	render: ({ count }) => (
		<Long kind="list" count={count} ms={WAIT_DELAY + 500} />
	),
	play: async ({ canvasElement, args }) => {
		try {
			const painted = () =>
				canvasElement.querySelectorAll("[data-painted]").length;
			const rows = () => mounted(canvasElement).length;
			let seen = false;
			const frames: string[] = [];
			const started = performance.now();
			while (performance.now() - started < 8000) {
				await frame();
				if (painted() > 0) seen = true;
				if (seen) frames.push(`${painted() > 0}:${rows() > 0}`);
				if (seen && rows() > 0) break;
			}
			// Painted rows, then the loaded rows: never neither, never both.
			await expect(frames.at(-1)).toBe("false:true");
			await expect(frames.filter((one) => one === "false:false")).toEqual([]);
			await expect(frames.filter((one) => one === "true:true")).toEqual([]);
			await expect(rows()).toBeLessThan(args.count / 4);
			await expect(flush.seen).toEqual([]);
		} finally {
			flush.restore();
		}
	},
};
