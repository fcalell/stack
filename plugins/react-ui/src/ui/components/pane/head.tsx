import { paints } from "@fcalell/plugin-api/read";
import {
	type Datum,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Route, Run } from "@fcalell/ui-core/descriptors";
import { actsSplit } from "@fcalell/ui-core/fold";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { endedReason } from "@fcalell/ui-core/read";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TITLE_FLOOR,
	PAGE_TOP_BAR,
	PAGE_WITHIN,
	PAGE_WITHIN_SEP,
	TITLE_CODE,
	text,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { type IconAct, type MenuEntry, wiringOf } from "../../lib/act.ts";
import { RunText } from "../../lib/code.tsx";
import { ShellMenu } from "../../lib/frame.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { Painted } from "../../lib/paint.tsx";
import { isCode, partRuns } from "../../lib/parts.ts";
import {
	BusyMark,
	endedItems,
	type Frame,
	FrameLine,
} from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconActFace } from "../button/face.tsx";
import { IconButtonBase, IconButtonLink } from "../button/glyph.tsx";
import { Button } from "../button/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { HeldPicker } from "../picker/base.tsx";
import type { PickOneProps } from "../picker/index.tsx";

// The back act stands at the bar's start as Back where the Pane stands alone
// (below `tablet` of the Place, first standing in it, or covering it), and at
// its end as Close where a Pane stands before it. A Pane folded away stands
// nowhere, so the first Pane standing is the first, or the one the fold leaves
// first: the next to last below `wide` (a Pane with one after it) and the
// third from last at any width (a Pane with two after it), the Panes before
// each folded.
const ALONE =
	"hidden place-max-tablet:flex group-first/pane:flex group-data-cover/pane:flex place-max-wide:group-[:has(~[data-page])]/pane:flex group-[:has(~[data-page]~[data-page])]/pane:flex";
const BESIDE =
	"flex place-max-tablet:hidden group-first/pane:hidden group-data-cover/pane:hidden place-max-wide:group-[:has(~[data-page])]/pane:hidden group-[:has(~[data-page]~[data-page])]/pane:hidden";
const HEAD = "flex flex-col";
// On touch the head carries a step of block padding, and the back act or the
// menu act reaches the page inset by its start, the acts by their end. The row
// is one line at every width: the title truncates and keeps its floor (two
// fifths of the row, a structural fraction, never a width), the first act
// stands and the rest stand in the more menu (`actsSplit`).
const ROW = "flex items-center";
const START = "touch:-ms-icon-inset";
// The context pick gives way after the title's floor: its trigger truncates its
// label, the dot and the chevron whole.
const PILL = "flex min-w-0 shrink";
const ACTS = "flex shrink-0 items-center gap-gap ms-auto touch:-me-icon-inset";
// The heading is the title's line, the busy mark after the title.
// The title's floor is `PAGE_TITLE_FLOOR`'s min-width: a `min-w-0` here would
// replace it, so the title would give way to the switcher or the acts to nothing.
const TITLE = "flex grow items-center gap-gap";
const NAME = "min-w-0 truncate";
// A record's place stands whole beside its name: it keeps its own width up to
// three fifths of the title and the name, which the body's head repeats whole,
// gives way first, so a name that waits (its filler) never cuts the place's
// word. The slash is a part of its own that is never cut. On touch the bar
// holds the back act and the name alone, as the phone's holds one part, so
// the name is never cut to a few letters; a record whose name will not come
// (its read ended) keeps its place there, the bar's one word.
const WITHIN = "flex shrink-0 items-center max-w-3/5";
const WITHIN_WIDE = "touch:hidden";
const WITHIN_SEP = "shrink-0";

/** A Pane's bar: the back act, the title, the context pick, the actions and more, and the line of its read's state. The bar is one line: the first act stands as its icon and the rest stand in the more menu, before its own items, at every width; the context pick's label truncates after the title's floor. It subscribes to the title and the acts itself, so a title or an act's read landing renders the bar and nothing under the Pane's body. A record's bar whose read failed or answered not found draws its place alone, with no slash, and none of the acts; its back or close act stands. Outside the package's exports. */
export function PaneHead(props: {
	/** Where a record lives, drawn before its name in the meta ink and parted from it by a slash, on the desktop (a `{ code }` run bare in the mono, as in the name); on touch the bar holds the name alone, the place standing at the start of the head's overline, and in the bar only once the record's read ended. A selection paints in its place until it lands. */
	within?: Datum<Run>;
	/** The id of the heading the title stands in, which names the Pane while the title is no filler. A record's Pane gives none: its bar holds the place, a paragraph, and its head holds the heading. */
	titleId?: string;
	/** The heading's level: 1 on the last Pane of its Place, which names the page, 2 on a Pane with another after it. */
	level: 1 | 2;
	/** What the bar draws: the Pane's title, or the place of a record. */
	title: Datum<Run>;
	back?: Route;
	actions?: readonly Datum<IconAct | IconLinkAct>[];
	more?: Datum<readonly MenuEntry[]>;
	/** The context the page reads in, drawn as a pill after the title. */
	context?: Omit<PickOneProps<string | null>, "fit">;
	/** The tone of the context the page reads in, the dot before the pick's label. */
	state?: Tone;
	/** The Pane's frame, whose busy mark and state line the bar draws. */
	frame: Frame;
}) {
	const {
		within,
		titleId,
		level,
		title,
		back,
		actions,
		more,
		context,
		state,
		frame,
	} = props;
	// A record whose read failed or answered not found is not here, so the bar
	// keeps where it lived and the way back and draws none of its acts: the page
	// below it is the failed or missing form, whose Retry is the one act.
	const gone =
		within !== undefined &&
		(frame.form === "failed" || frame.form === "missing");
	const touch = useTouch();
	const far = use(DistanceContext);
	const words = useWords();
	const menu = use(ShellMenu);
	const [name, place, overflowAt, ...actionAt] = useSelections([
		title,
		within ?? "",
		more,
		...(actions ?? []),
	]);
	useDrawsFailure([more, ...(actions ?? [])]);
	const goBack =
		back === undefined ? null : (
			<span className={cn(ALONE, START)}>
				<IconButtonLink icon={BACK_GLYPH} label={words.back} href={back} />
			</span>
		);
	// On touch the shell's menu act (the way to its places) leads a Pane with
	// no way back; on the desktop the places stand in the sidebar.
	const pick =
		touch && menu && back === undefined ? (
			<span className={START}>
				<Button
					glyph
					icon={menu.icon}
					label={menu.label}
					onAct={menu.onAct}
					{...wiringOf(menu)}
				/>
			</span>
		) : null;
	// An act is painted, inert, while its own datum waits; a selection's shape
	// is unknown until it lands, so its paint is a bare glyph. One whose read
	// ended stands blocked with the sentence for its name, never a false yes.
	const built = actionAt.map((one, at) => {
		if (!one.painted) {
			return <IconActFace key={one.value.label} act={one.value} />;
		}
		const ended = endedReason(words, one.phase);
		return (
			<IconButtonBase
				// biome-ignore lint/suspicious/noArrayIndexKey: a painted act has no name, and the acts stand in a fixed order
				key={at}
				icon={ended ? "CircleAlert" : "Ellipsis"}
				label={ended ?? ""}
				disabled={ended !== undefined}
				painted={ended === undefined}
			/>
		);
	});
	const overflowEnded = overflowAt.painted
		? endedReason(words, overflowAt.phase)
		: undefined;
	const own = overflowEnded
		? endedItems(words, overflowEnded)
		: overflowAt.painted
			? []
			: (overflowAt.value ?? []);
	const { standing } = actsSplit(built);
	// The acts folded into the menu stand before its own, in their order; one
	// whose read waits has no name yet and one whose read ended stands blocked.
	const folded = actsSplit(actionAt).folded.flatMap(
		(one): readonly MenuEntry[] => {
			if (!one.painted) return [one.value];
			const ended = endedReason(words, one.phase);
			return ended ? endedItems(words, ended) : [];
		},
	);
	const items: readonly MenuEntry[] = [...folded, ...own];
	const close =
		back === undefined ? null : (
			<span className={BESIDE}>
				<IconButtonLink icon="X" label={words.close} href={back} />
			</span>
		);
	const overflow =
		!gone && (overflowAt.painted || items.length) ? (
			<MenuBase
				label={words.more}
				title={words.more}
				items={items}
				painted={
					overflowAt.painted &&
					overflowEnded === undefined &&
					folded.length === 0
				}
			/>
		) : null;
	// A name whose read ended draws nothing, so the slash after the place would
	// dangle.
	const nameless = name.painted && !paints(name);
	// A painted title is filler, and a record's place is no heading: each stands
	// as a paragraph of the title's own look.
	const Title = titleId && !name.painted ? (`h${level}` as const) : "p";
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts and their focus.
	return (
		<header className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM, HEAD)}>
			<div className={cn(PAGE_TOP_BAR, ROW)}>
				{goBack}
				{pick}
				<Title
					id={titleId}
					className={cn(text({ role: "heading" }), PAGE_TITLE_FLOOR, TITLE)}
				>
					{within === undefined ? null : (
						<span
							className={cn(
								text({ role: "body" }),
								PAGE_WITHIN,
								WITHIN,
								!(gone || nameless) && WITHIN_WIDE,
							)}
						>
							<span className={NAME}>
								{paints(place) ? (
									<Painted role="word" />
								) : place.painted ? null : (
									<RunText runs={partRuns(place.value as Run)} fit="name" />
								)}
							</span>
							{nameless ? null : (
								<span aria-hidden className={cn(PAGE_WITHIN_SEP, WITHIN_SEP)} />
							)}
						</span>
					)}
					<span className={NAME}>
						{paints(name) ? (
							<Painted role="title" />
						) : name.painted ? null : isCode(name.value) ? (
							<code className={TITLE_CODE}>{name.value.code}</code>
						) : (
							<RunText runs={partRuns(name.value)} fit="name" />
						)}
					</span>
					<BusyMark frame={frame} />
				</Title>
				{context ? (
					<span className={PILL}>
						<HeldPicker {...context} fit="pill" state={state} />
					</span>
				) : null}
				<span className={ACTS}>
					{gone ? null : standing}
					{overflow}
					{close}
				</span>
			</div>
			<FrameLine frame={frame} />
		</header>
	);
}
