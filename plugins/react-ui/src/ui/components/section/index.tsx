import { Collapsible } from "@base-ui/react/collapsible";
import {
	combine,
	type Datum,
	isSelection,
	pagesOf,
	type Selection,
	sampleOf,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Band as BandData,
	FileItem as FileItemData,
	IconLinkAct,
	LinkAct,
	Reorder,
	Row as RowData,
	RowItem as RowItemData,
	Run,
} from "@fcalell/ui-core/descriptors";
import { factsOnly, listedRows, ownCount } from "@fcalell/ui-core/list-state";
import { ROWS, SECTION, SECTION_BODY } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useMemo, useRef, useState } from "react";
import type {
	Act,
	IconAct,
	MenuEntry,
	Offered,
	Sheeted,
} from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import {
	type Frame,
	FrameBody,
	FrameLine,
	StateLine,
	useCollection,
	useFrame,
	useOptions,
} from "../../lib/read.tsx";
import { useMovable } from "../../lib/reorder.ts";
import { useWords } from "../../lib/words.tsx";
import { SheetCard } from "./card.tsx";
import { SectionHead } from "./head.tsx";
import { keyOf, Rows } from "./rows.tsx";

// The Section is a `ROWS` run of its own, so its head and its body span both
// columns; in a Pane's body (or any `ROWS` that is a grid) it subgrids the
// parent's two columns instead, and its body and sheet subgrid it in turn, so
// every definition row in the Pane puts its label in the Pane's one label
// column.
const BOX = "min-w-0";
// The body is its parts, each a card of its own, a `ROWS` run too.
const BODY = ROWS;

/** A band as the platform draws it: its act may open a sheet. */
export type Band = Omit<BandData, "act"> & { act?: IconAct | IconLinkAct };

/** A descriptor as the platform draws it: each field that can be a read of its own (a row's `act`, `more`, `title`, `line` and `facts`, a switch's `checked`, a pick's `options` and `value`, the same in a tree's children) may be a `Datum`; the row's `facts` may be a read of the whole list or a list of facts that are each a read of their own. */
export type WithReads<T> = T extends unknown
	? {
			[K in keyof T]: K extends "act" | "more"
				? Datum<Sheeted<T[K]>>
				: K extends "facts"
					? T[K] extends readonly (infer F)[] | undefined
						? Datum<readonly Datum<F>[]>
						: never
					: K extends "title" | "line" | "value" | "options" | "checked"
						? Datum<Exclude<T[K], undefined>>
						: K extends "switch" | "pick"
							? WithReads<T[K]>
							: K extends "children"
								? T[K] extends readonly (infer C)[] | undefined
									? readonly WithReads<C>[] | undefined
									: never
								: T[K];
		}
	: never;

/** A row of a Section's sheet: a row item or a file, its reads widened to a `Datum`. */
export type Row<V extends string | null = string> = WithReads<RowData<V>>;
/** A row item as the platform draws it. */
export type RowItem<V extends string | null = string> = WithReads<
	RowItemData<V>
>;
/** A file row as the platform draws it. */
export type FileItem = WithReads<FileItemData>;

interface SectionHeadProps extends Closed {
	/** Under the title (a sentence; wraps). It paints where it will stand while its selection waits; `""` and an undefined one draw no line. */
	description?: Datum<string>;
	/** Set, the title folds the body, and this is its initial fold: `true` starts folded, `false` open; later changes are not read. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: an icon act, or an icon link to a route (`{ icon, label, href }`, drawn as an anchor); its words are its accessible name. It is live whatever the read does. Given as a selection it paints, inert, while its own read waits or stands still, and stands blocked with the failed sentence once that read failed or is missing; its `label` and `blocked` may be selections on their own, which paint it the same way. */
	act?: Offered<IconAct | IconLinkAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked; a `{ label, href }` entry goes to its route); the head row never moves, and a foldable section's more does not fold it. It paints and stands blocked as the act does. */
	more?: Offered<readonly MenuEntry[]>;
}

type Parts = SectionHeadProps & {
	/** The heading (a short phrase; truncates on the desktop and wraps on touch). A section titled by its record takes a `Datum`: a selection of the read the section holds (its `read`), never a second read of its own; it paints a title-length filler, its heading inert and hidden from assistive tech, until it lands.  A title whose read ended (failed or missing) draws no head at all (no heading, count or acts): the failed or missing form of the Section stands alone in its place. */
	title: Datum<Run>;
	/** The body's parts, each a card of its own: a Form, a Table, a Stats, a BarChart, or a `Card` around anything else; none stand while the `read` is empty. */
	children?: ReactNode;
	items?: never;
	groups?: never;
} & (
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the section's body holds, read once for the frame: while it waits the body's leaves paint, its failure and a missing record stand in the body's place, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				description?: undefined;
				/** What the body says when the `read` is empty: this stands in the body's place in a hairline frame, the `sentence` and the act after it. */
				empty?: Empty;
		  }
		| {
				read: Selection<unknown>;
				description: Datum<string>;
				/** The act the body offers when the `read` is empty, alone in a hairline frame: the description says what the section holds, so the frame draws no sentence of its own, only the word for none when no act is given. */
				empty?: { act: Act | LinkAct };
		  }
	);

type Sheet<V extends string | null> = SectionHeadProps & {
	/** The heading (a short phrase; truncates); the head over the sheet is drawn with it, and a Section with no title is the sheet alone. */
	title?: Datum<Run>;
	/** The sheet's rows: constants (none draw the empty form, as an empty read does), or a selection, which paints as many list rows as it last loaded (`PAINT_ROWS` the first time) until its read lands, each in the slots its selector gives one record where it maps the records (`list.map(toRow)`), else a title over a facts line. A selection is the section's own frame: it holds its read and draws the failed, missing and empty forms in the sheet's place, and the head's count is the loaded rows'. One row given alone, not in an array, is a value (a field that holds one thing), no list: it stands on the sheet as a row of a list does, and the head draws no count. */
	items: Datum<readonly Row<V>[]> | Row<V>;
	/** The sheet's bands, in order: a band over the list rows of each (their `group` is its `key`), with its label, the count of its rows (none for a lone band holding every row under a counted head, whose count is the same) and its act. Rows whose `group` names no key, or with none, stand before the first band; the painted (waiting) rows stand with no bands. A selection is the section's own read as `items` is: the rows paint with no bands until it lands, and its failed, missing and empty forms stand in the sheet's place. */
	groups?: Datum<readonly Band[]>;
	/** The sheet's rows can be moved: a press that moves drags a row to the line between two others (the sheet scrolls near its edges), Alt with Up, Down, Home or End moves the focused row, and every row's more menu holds Move up, down, to top and to bottom. `onMove` hears the id and where it lands (`index`, and the ids it stands `after` and `before`); the rows show the move at once and the order the read answers replaces it. A flat sheet only: a tree or a sheet with `groups` does not reorder. */
	reorder?: Reorder;
	children?: never;
	/** What the sheet says when its `items` are empty (a read that answered none, or no constants): the sentence and the act that makes the first one, in place of the generic sentence; under a `description`, with no sentence given, its act alone or the word for none. */
	empty?: Empty;
};

/** A titled stretch of a page over its rows, or its parts. With `items` it draws the sheet of rows (a list row, a definition or a file row each); with `children` it frames parts, and `empty` belongs to the `read` it answers for, so one given without the other does not type-check; a parts Section with a `description` takes an `empty` of its `act` alone, since its frame never draws a sentence, and a described sheet draws the sentence it is given, never the generic one. */
export type SectionProps<V extends string | null = string> = Parts | Sheet<V>;

/** A heading (13 at 500) with its count in the meta ink, description, act and more act over its body; the title folds the body when `folded` is set, at the heading size folded or not. With `items` the body is the hairline sheet on the surface, its rows abutting under a hairline once between them: one row per item, `PAINT_ROWS` list rows while the `items` selection's read waits (each painted, inert and with no link; a tree draws flat then), the failed form with Retry, the missing form saying it was not found and the empty form each on a sheet with the generic sentence (the empty form under a `description` its own sentence, else its act alone or the word for none), the stale and paused line above the rows, and the count of the loaded rows after the title (its top-level rows, the things it lists, less any row with `counted: false` (a journey's entry, end or add row, a ref that rejoins) that is no step of it, with any nested row with `counted: true` (a step in an option's leg): a tree's other nested rows are parts of their row), unless every row has a label (facts, which a count does not number) or `items` is one row given alone (a value, no list). A band with `groups` spans the sheet, 32 high, closed by a rule in the body ink, its text at the rows' inset; `children` on a list row make the sheet a tree. A definition row draws no hairlines of its own, its 28 px rows abutting on the sheet. With `children` the body stands on the canvas, a sections gap from the next: its parts a fields gap apart, each a card of its own (a Form, a Table, a Stats, a BarChart, or a `Card` around anything else), and its empty form on a card of its own; the Section draws no card, no count beside its title (a count is a list's) and reads nothing of its children. A Section with `items` and no `title` draws no head: the sheet alone. A blocked act's reason draws under the head row, which never moves. No Section stands in a Section. It is a `section` with no name, so no landmark of its own (a `section` is a region only when named): the `Pane` is the page's named region, and a Section titled as its Pane is not a second region of that name. */
export function Section<V extends string | null = string>(
	props: SectionProps<V>,
) {
	return props.items === undefined ? (
		<PartsSection {...props} />
	) : (
		<SheetSection {...props} />
	);
}

// A described Section's empty form says no generic sentence, its description
// saying what it holds: a sheet's own sentence stands, else the act alone, or
// the word for none.
// The shape the waiting rows paint in: one record as the items' selector maps
// it, where that is a list row; else the roster's title over a facts line.
function paintOf<V extends string | null>(
	items: Datum<readonly Row<V>[]>,
): RowItem | undefined {
	if (!isSelection(items)) return undefined;
	const one = sampleOf(items);
	if (one === undefined || "path" in one) return undefined;
	const row = one as RowItem;
	// Facts the selector passes through whole (`facts: record.facts`) sample
	// as the placeholder itself, a word where the facts stand: they paint one
	// part, as facts built in parts do, so the row keeps its facts line.
	return typeof row.facts === "string" ? { ...row, facts: [""] } : row;
}

function emptyOf(
	description: Datum<string> | undefined,
	empty: Empty | { act: Act | LinkAct } | undefined,
	none: string,
): { sentence?: Datum<string>; act?: Act | LinkAct } | undefined {
	if (
		description === undefined ||
		(empty && "sentence" in empty && empty.sentence)
	)
		return empty;
	return empty?.act ? { act: empty.act } : { sentence: none };
}

function PartsSection(props: Parts) {
	const { read, empty, description, children } = props;
	const words = useWords();
	const frame = useFrame(read);
	const body =
		read === undefined ? (
			children
		) : (
			<FrameBody frame={frame} empty={emptyOf(description, empty, words.none)}>
				{children}
			</FrameBody>
		);
	return <Titled {...props} list={false} frame={frame} body={body} />;
}

const NO_ROWS: readonly RowData[] = [];

// The selections a pick row draws its options from, a tree's children too: the
// reads the sheet says once, where each row's picker would say it again.
function optionsOf(rows: readonly RowData[]): Selection<unknown>[] {
	return rows.flatMap((row) => {
		if ("path" in row) return [];
		const own = row.pick?.options;
		return [
			...(isSelection(own) ? [own] : []),
			...optionsOf((row.children ?? []) as readonly RowData[]),
		];
	});
}

function SheetSection<V extends string | null>(props: Sheet<V>) {
	const { title, groups, description, empty } = props;
	// One row given alone is a value, not a list: it stands as a list of one,
	// and its head counts nothing (a count is a list's).
	const one = !Array.isArray(props.items) && !isSelection(props.items);
	const items = (one ? [props.items] : props.items) as Datum<readonly Row<V>[]>;
	const words = useWords();
	// The sheet's data is its rows together with the reads they stand on: when
	// `groups` is a selection, the rows paint until it lands and its
	// failure ends the sheet, as the rows' own read does.
	const together = [items, groups].filter(isSelection);
	const whole =
		isSelection(items) && together.length === 1
			? items
			: together.length > 0
				? combine(together as [Selection<unknown>], (...values) =>
						isSelection(items) ? values[0] : items,
					)
				: items;
	const collection = useCollection(whole as Datum<readonly Row<V>[]>);
	const { drawn } = collection;
	const [bands] = useSelections([groups] as const);
	// A constant with no rows is empty as a read that answered none is: its
	// empty form stands (`empty`, else the generic sentence), never a sheet
	// with nothing on it.
	const frame: Frame =
		!isSelection(whole) && (items as readonly Row<V>[]).length === 0
			? { ...collection.frame, form: "empty" }
			: collection.frame;
	// The sheet is the box the rows stand in, which they window in.
	const box = useRef<HTMLDivElement>(null);
	// A flat sheet orders its rows as the viewer moved them.
	const loaded = drawn.painted ? NO_ROWS : (drawn.value as readonly RowData[]);
	const { rows: ordered, movable } = useMovable({
		reorder: props.reorder,
		on:
			props.reorder !== undefined &&
			!drawn.painted &&
			groups === undefined &&
			!loaded.some((row) => "children" in row && row.children !== undefined),
		source: drawn.painted ? undefined : drawn.value,
		rows: loaded,
		idOf: keyOf as (row: RowData) => string,
		box,
	});
	// While the rows wait they paint in the shape the items' selector gives one
	// record (its leading mark, its facts, its trailing value), so the text and
	// the end group stand where the loaded rows' will.
	const paint = useMemo(() => paintOf(items), [items]);
	const forms = (
		<FrameBody
			frame={frame}
			fit="part"
			empty={emptyOf(description, empty, words.none)}
		>
			{title === undefined ? <FrameLine frame={frame} /> : null}
			<PicksLine rows={loaded} />
			<SheetCard box={box}>
				<Rows
					drawn={
						(drawn.painted ? drawn : { ...drawn, value: ordered }) as never
					}
					more={pagesOf(items)}
					box={box}
					paint={paint}
					groups={bands.painted ? undefined : bands.value}
					movable={movable}
					counted={
						!one &&
						title !== undefined &&
						!factsOnly(drawn.value as readonly Row[])
					}
				/>
			</SheetCard>
		</FrameBody>
	);
	// The failed, missing and empty forms stand at the sheet's inset inside the
	// sheet's own card, headed or not, where the rows would stand.
	const body =
		frame.form === "failed" ||
		frame.form === "missing" ||
		frame.form === "empty" ? (
			<SheetCard>{forms}</SheetCard>
		) : (
			forms
		);
	if (title === undefined) return body;
	return (
		<Titled
			{...props}
			title={title}
			list={!one && (drawn.painted || !factsOnly(drawn.value))}
			frame={frame}
			// The count is the things the Section lists: its top-level rows less
			// those marked `counted: false`, and the nested rows marked `counted:
			// true`, so it agrees with a head's "N steps"; a nested row is otherwise
			// a part of its row. A read's own count is the top level, and stands
			// unless a row says otherwise.
			count={
				drawn.painted || (isSelection(items) && ownCount(drawn.value))
					? undefined
					: listedRows(drawn.value).length
			}
			body={body}
		/>
	);
}

// What the sheet says once of the options its rows' picks read: a row's pick
// draws its box blocked (inert) when its options ended, the sentence and the
// retry stand here, a line over the sheet, never repeated in every row.
function PicksLine({ rows }: { rows: readonly RowData[] }) {
	const words = useWords();
	const options = optionsOf(rows);
	const picks =
		options.length === 0
			? undefined
			: combine(options as [Selection<unknown>], () => null);
	const { drawn, retry } = useOptions(picks);
	if (!drawn.painted) return null;
	if (drawn.phase === "failed")
		return (
			<StateLine
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: retry }}
			/>
		);
	return drawn.phase === "missing" ? (
		<StateLine sentence={words.missing} />
	) : null;
}

// The head over a body, the body folding under the title when the Section is
// foldable. The frame is the Section's read: its busy mark, its state line and
// its count stand in the head.
function Titled(
	props: SectionHeadProps & {
		title: Datum<Run>;
		frame: Frame;
		list: boolean;
		count?: number;
		body: ReactNode;
	},
) {
	const {
		title,
		list,
		count,
		description,
		folded,
		onToggle,
		act,
		more,
		frame,
		body,
	} = props;
	const level = use(HeadingContext);
	const bodyId = useId();
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	return (
		<Collapsible.Root
			render={<section />}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onToggle?.(next);
			}}
			aria-busy={(frame.holds && frame.form === "waiting") || undefined}
			data-still={(frame.holds && frame.form === "still") || undefined}
			className={cn(SECTION, ROWS, BOX)}
		>
			<SectionHead
				title={title}
				list={list}
				count={count}
				description={description}
				act={act}
				more={more}
				foldable={folded !== undefined}
				open={open}
				bodyId={bodyId}
				frame={frame}
			/>
			{/* Kept mounted while folded, so its `aria-controls` resolves in either state (Base UI names it only while open) and what the body holds (a field's text, a fold inside) keeps its state. A section without children draws no body. */}
			{body == null || body === false ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(SECTION_BODY, BODY)}
				>
					<HeadingContext value={DEEPER[level]}>{body}</HeadingContext>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
