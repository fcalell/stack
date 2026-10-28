import { Collapsible } from "@base-ui/react/collapsible";
import {
	type Datum,
	isSelection,
	pagesOf,
	type Selection,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Band as BandData,
	FileItem as FileItemData,
	IconLinkAct,
	LinkAct,
	Row as RowData,
	RowItem as RowItemData,
	Run,
} from "@fcalell/ui-core/descriptors";
import { factsOnly } from "@fcalell/ui-core/list-state";
import { ROWS, SECTION, SECTION_BODY } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useRef, useState } from "react";
import type { Act, IconAct, MenuEntry, Sheeted } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import {
	type Frame,
	FrameBody,
	FrameLine,
	useCollection,
	useFrame,
} from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { SheetCard } from "./card.tsx";
import { SectionHead } from "./head.tsx";
import { Rows } from "./rows.tsx";

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

/** A descriptor as the platform draws it: each field that can be a read of its own (a row's `act`, `more`, `title` and `meta`, a switch's `checked`, a pick's `options` and `value`, the same in a tree's children) may be a `Datum`. */
export type WithReads<T> = T extends unknown
	? {
			[K in keyof T]: K extends "act" | "more"
				? Datum<Sheeted<T[K]>>
				: K extends "title" | "meta" | "value" | "options" | "checked"
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
	/** The section's one act, at the head's end: an icon act, or an icon link to a route (`{ icon, label, href }`, drawn as an anchor); its words are its accessible name. It is live whatever the read does. Given as a selection it paints, inert, while its own read waits or stands still, and stands blocked with the failed sentence once that read failed or is missing. */
	act?: Datum<IconAct | IconLinkAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked; a `{ label, href }` entry goes to its route); the head row never moves, and a foldable section's more does not fold it. It paints and stands blocked as the act does. */
	more?: Datum<readonly MenuEntry[]>;
}

type Parts = SectionHeadProps & {
	/** The heading (a short phrase; truncates on the desktop and wraps on touch). A section titled by its record takes a `Datum`: a selection of the read the section holds (its `read`), never a second read of its own; it paints a title-length filler, its heading inert and hidden from assistive tech, until it lands.  A title whose read ended (failed or missing) draws no head at all (no heading, count or acts): the failed or missing form of the Section stands alone in its place. */
	title: Datum<Run>;
	/** The body's parts, each a card of its own: a Form, a Table, or a `Card` around anything else; none stand while the `read` is empty. */
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
	/** The sheet's rows: constants, or a selection, which paints `PAINT_ROWS` list rows until its read lands. A selection is the section's own frame: it holds its read and draws the failed, missing and empty forms in the sheet's place, and the head's count is the loaded rows'. */
	items: Datum<readonly Row<V>[]>;
	/** The sheet's bands, in order: a band over the list rows of each (their `group` is its `key`), with its label, the count of its rows (none for a lone band holding every row under a counted head, whose count is the same) and its act. Rows whose `group` names no key, or with none, stand before the first band; the painted (waiting) rows stand with no bands. */
	groups?: readonly Band[];
	children?: never;
	read?: never;
	/** What the sheet says when its `items` read is empty: the sentence and the act that makes the first one, in place of the generic sentence; under a `description`, with no sentence given, its act alone or the word for none. */
	empty?: Empty;
};

/** A titled stretch of a page over its rows, or its parts. With `items` it draws the sheet of rows (a list row, a definition or a file row each); with `children` it frames parts, and `empty` belongs to the `read` it answers for, so one given without the other does not type-check; a parts Section with a `description` takes an `empty` of its `act` alone, since its frame never draws a sentence, and a described sheet draws the sentence it is given, never the generic one. */
export type SectionProps<V extends string | null = string> = Parts | Sheet<V>;

/** A heading (13 at 500) with its count in the meta ink, description, act and more act over its body; the title folds the body when `folded` is set, at the heading size folded or not. With `items` the body is the hairline sheet on the surface, its rows abutting under a hairline once between them: one row per item, `PAINT_ROWS` list rows while the `items` selection's read waits (each painted, inert and with no link; a tree draws flat then), the failed form with Retry, the missing form saying it was not found and the empty form each on a sheet with the generic sentence (the empty form under a `description` its own sentence, else its act alone or the word for none), the stale and paused line above the rows, and the count of the loaded rows after the title, unless every row has a label (facts, which a count does not number). A band with `groups` spans the sheet, 32 high, closed by a rule in the body ink, its text at the rows' inset; `children` on a list row make the sheet a tree. A definition row draws no hairlines of its own, its 28 px rows abutting on the sheet. With `children` the body stands on the canvas, a sections gap from the next: its parts a fields gap apart, each a card of its own (a Form, a Table, or a `Card` around anything else), and its empty form on a card of its own; the Section draws no card, no count beside its title (a count is a list's) and reads nothing of its children. A Section with `items` and no `title` draws no head: the sheet alone. A blocked act's reason draws under the head row, which never moves. No Section stands in a Section. It is a `section` with no name, so no landmark of its own (a `section` is a region only when named): the `Pane` is the page's named region, and a Section titled as its Pane is not a second region of that name. */
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
function emptyOf(
	description: Datum<string> | undefined,
	empty: Empty | { act: Act | LinkAct } | undefined,
	none: string,
): { sentence?: string; act?: Act | LinkAct } | undefined {
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

function SheetSection<V extends string | null>(props: Sheet<V>) {
	const { title, items, groups, description, empty } = props;
	const words = useWords();
	const { drawn, frame } = useCollection(items);
	// The sheet is the box the rows stand in, which they window in.
	const box = useRef<HTMLDivElement>(null);
	const forms = (
		<FrameBody
			frame={frame}
			fit="part"
			empty={emptyOf(description, empty, words.none)}
		>
			{title === undefined ? <FrameLine frame={frame} /> : null}
			<SheetCard box={box}>
				<Rows
					drawn={drawn as never}
					more={pagesOf(items)}
					box={box}
					groups={groups}
					counted={
						title !== undefined && !factsOnly(drawn.value as readonly Row[])
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
			list={drawn.painted || !factsOnly(drawn.value)}
			frame={frame}
			count={
				drawn.painted || isSelection(items) ? undefined : drawn.value.length
			}
			body={body}
		/>
	);
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
