import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { WAIT_DELAY } from "@fcalell/ui-core/paint";
import { ENGLISH } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// A collection over a pages read ends in its more row: "Show more" while a
// next page remains (pressed by the viewer), painted rows while it loads,
// "Couldn't load more" with Retry when it failed. The frame holds the read and
// is not busy for a next page; it draws no count while more remains. An empty
// first page that has more is not empty: the next page is fetched at once.
// Each collection is drawn in its forms, at both widths.
interface Row {
	id: string;
	name: string;
}

// Names carry no digit, so a digit in the frame is its count.
const NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf"];
const row = (name: string): Row => ({ id: name, name });
const PAGES = [NAMES.slice(0, 3), NAMES.slice(3, 6), NAMES.slice(6)].map(
	(page) => page.map(row),
);

interface How {
	pages?: Row[][];
	// The first request for a next page rejects.
	fail?: boolean;
	// A next page answers once this resolves.
	hold?: Promise<void>;
}

let made = 0;
function source(how: How): Read<readonly Row[]> {
	const pages = how.pages ?? PAGES;
	let asked = 0;
	return read<readonly Row[]>(
		{
			queryKey: ["more", made++],
			queryFn: async ({ pageParam }: { pageParam?: string }) => {
				const at = Number(pageParam ?? 0);
				if (at > 0) {
					if (how.fail && asked++ === 0) throw new Error("The page fails.");
					await how.hold;
				}
				return {
					data: pages[at] ?? [],
					nextCursor: at + 1 < pages.length ? String(at + 1) : null,
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

const COLUMNS: TableColumn<Row>[] = [
	{ key: "name", label: "Name", cell: (each) => each.name },
];
const LIST_ROW = {
	key: (each: Row) => each.id,
	title: (each: Row) => each.name,
};

type Kind = "list" | "group" | "wide" | "narrow";

function Collection(props: { kind: Kind; items: Read<readonly Row[]> }) {
	const { kind, items } = props;
	return (
		<div
			style={{
				width: kind === "narrow" ? 375 : 900,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Deploys">
					<Section title="Recent" read={items}>
						{kind === "list" ? <List items={items} row={LIST_ROW} /> : null}
						{kind === "group" ? (
							<Group list={{ items, row: LIST_ROW }} />
						) : null}
						{kind === "wide" || kind === "narrow" ? (
							<Table
								columns={COLUMNS}
								items={items}
								row={{ id: (each) => each.id }}
							/>
						) : null}
					</Section>
				</Pane>
			</Place>
		</div>
	);
}

// The read is made once, with a gate the play opens.
function Case(props: { kind: Kind; how: Omit<How, "hold">; held?: boolean }) {
	const [gate] = useState(() => {
		let open = () => {};
		const hold = new Promise<void>((done) => {
			open = done;
		});
		(window as unknown as { __gate?: () => void }).__gate = open;
		return { hold: props.held ? hold : undefined };
	});
	const [items] = useState(() => source({ ...props.how, hold: gate.hold }));
	return <Collection kind={props.kind} items={items} />;
}

const release = () => (window as unknown as { __gate: () => void }).__gate();
const digits = (root: HTMLElement) => /\d/.test(root.textContent ?? "");
const marks = (root: ParentNode) => root.querySelectorAll("[data-busy]");
const painted = (root: ParentNode) =>
	root.querySelectorAll("[data-painted]").length;

export default {
	title: "Behaviour/More",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

// "Show more" stands under the loaded rows; the frame has no count while more
// remains; a press loads the next page behind painted rows, and the frame is
// not busy and not aria-busy while it does.
function show(kind: Kind): StoryObj {
	return {
		render: () => <Case kind={kind} how={{}} held />,
		play: async ({ canvas, canvasElement, userEvent }) => {
			await canvas.findByText("Charlie");
			const button = await canvas.findByRole("button", { name: "Show more" });
			await expect(digits(canvasElement)).toBe(false);
			await expect(painted(canvasElement)).toBe(0);
			await userEvent.click(button);
			await waitFor(() => expect(painted(canvasElement)).toBeGreaterThan(0));
			// Past the wait delay the frame still draws no busy mark.
			await new Promise((done) => setTimeout(done, WAIT_DELAY + 300));
			await expect(marks(canvasElement).length).toBe(0);
			await expect(canvasElement.querySelector("[aria-busy=true]")).toBeNull();
			await expect(
				canvas.queryByRole("button", { name: "Show more" }),
			).toBeNull();
			await expect(canvas.getByText("Charlie")).toBeVisible();
			release();
			await canvas.findByText("Foxtrot");
			await waitFor(() => expect(painted(canvasElement)).toBe(0));
			// More remains: the row is back, and still no count.
			await canvas.findByRole("button", { name: "Show more" });
			await expect(digits(canvasElement)).toBe(false);
			await userEvent.click(canvas.getByRole("button", { name: "Show more" }));
			await canvas.findByText("Golf");
			// The last page: no row, and the count stands.
			await waitFor(() =>
				expect(canvas.queryByRole("button", { name: "Show more" })).toBeNull(),
			);
			await expect(canvasElement.textContent).toContain("7");
		},
	};
}

// A failed next page is the collection's line with Retry; the rows stay.
function failed(kind: Kind): StoryObj {
	return {
		render: () => <Case kind={kind} how={{ fail: true }} />,
		play: async ({ canvas, userEvent }) => {
			await userEvent.click(
				await canvas.findByRole("button", { name: "Show more" }),
			);
			await canvas.findByText(ENGLISH.moreFailed);
			await expect(canvas.getByText("Charlie")).toBeVisible();
			await expect(canvas.queryByText(ENGLISH.readFailed)).toBeNull();
			await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
			await canvas.findByText("Foxtrot");
			await waitFor(() =>
				expect(canvas.queryByText(ENGLISH.moreFailed)).toBeNull(),
			);
		},
	};
}

// An empty first page with more is not empty: the next page is fetched at once,
// behind painted rows, and the empty form never draws.
function emptyFirst(kind: Kind): StoryObj {
	return {
		render: () => (
			<Case
				kind={kind}
				how={{ pages: [[], PAGES[0] ?? [], PAGES[1] ?? []] }}
				held
			/>
		),
		play: async ({ canvas, canvasElement }) => {
			await waitFor(() => expect(painted(canvasElement)).toBeGreaterThan(0));
			await expect(canvas.queryByText(ENGLISH.readEmpty)).toBeNull();
			await expect(
				canvas.queryByRole("button", { name: "Show more" }),
			).toBeNull();
			release();
			await canvas.findByText("Alpha");
			await expect(canvas.queryByText(ENGLISH.readEmpty)).toBeNull();
			await canvas.findByRole("button", { name: "Show more" });
		},
	};
}

export const ListShowMore = show("list");
export const GroupShowMore = show("group");
export const TableShowMore = show("wide");
export const TableNarrowShowMore = show("narrow");

export const ListFailedPage = failed("list");
export const GroupFailedPage = failed("group");
export const TableFailedPage = failed("wide");
export const TableNarrowFailedPage = failed("narrow");

export const ListEmptyFirstPage = emptyFirst("list");
export const GroupEmptyFirstPage = emptyFirst("group");
export const TableEmptyFirstPage = emptyFirst("wide");
export const TableNarrowEmptyFirstPage = emptyFirst("narrow");
