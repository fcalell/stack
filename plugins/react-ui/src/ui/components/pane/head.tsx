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
import { useTouch } from "../../lib/media.ts";
import { Painted } from "../../lib/paint.tsx";
import { isCode, partRuns, partText } from "../../lib/parts.ts";
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
// its end as Close where a Pane stands before it. Which of the two the Pane's
// place calls for is the Place's to say: it sets `--pane-back` and `--pane-close`
// on the Pane (a `display` each), so the head reads no sibling. Drawn outside
// a Place the Pane is alone, so Back stands.
const ALONE = "[display:var(--pane-back,flex)] group-data-cover/pane:flex";
const BESIDE = "[display:var(--pane-close,none)] group-data-cover/pane:hidden";
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
// On touch a record's name stands whole in the head under the bar: the bar's
// keeps its box and stands only once the head's has scrolled up under it, so
// the page never shows the name twice, the second time cut. The wait is CSS, a
// scroll-driven animation on the head's name's view timeline
// (`record-name-waits` in globals.css); a browser without it keeps the bar's
// name standing.
const NAME_WAITS = "touch:record-name-waits";
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

/** A Pane's bar: the back act, the title, the context pick, the actions and more, and the line of its read's state. The bar is one line: the first act stands as its icon and the rest stand in the more menu, before its own items, at every width; the context pick's label truncates after the title's floor. It subscribes to the title and the acts itself, so a title or an act's read landing renders the bar and nothing under the Pane's body. A record's bar whose read failed or answered not found draws its place alone, with no slash, and none of the acts; its back act stands where the Pane stands alone, and its close act only where the read failed, a missing record's way back being its Back. Outside the package's exports. */
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
	/** The body's head shows the record's name: on touch the bar's waits until the head's scrolls up under the bar. */
	headed?: boolean;
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
		headed,
	} = props;
	// A Pane whose own read failed or answered not found draws none of its acts:
	// the page below the bar is the failed or missing form, whose Retry (or way
	// back) is the one act, and an act of the read that ended would only stand
	// blocked beside it. A record's bar keeps where it lived and the way back.
	const gone = frame.form === "failed" || frame.form === "missing";
	const touch = useTouch();
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
	// The touch sheet of the more menu is titled by the Pane's record, its
	// title (a record's name), as a row's is by the row; the act keeps "More"
	// as its name. A title that waits or ended leaves the sheet "More".
	const named = name.painted ? "" : partText(name.value);
	// A Pane whose read answered not found has its way back in the missing
	// form, Back under its sentence, so the bar draws no Close beside it: one
	// way out, not two.
	const close =
		back === undefined || frame.form === "missing" ? null : (
			<span className={BESIDE}>
				<IconButtonLink icon="X" label={words.close} href={back} />
			</span>
		);
	const overflow =
		!gone && (overflowAt.painted || items.length) ? (
			<MenuBase
				label={words.more}
				title={named === "" ? words.more : named}
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
	// The title is the Pane's heading in every form it draws: a waiting title
	// paints inside it, named by the waiting word since its filler is hidden,
	// so the page keeps its heading while the title loads. A title whose read
	// ended draws nothing, the body's failed or missing form standing as the
	// heading, and a record's place is no heading: each stands as a paragraph of
	// the title's own look.
	const Title = titleId && !nameless ? (`h${level}` as const) : "p";
	const waits = Boolean(titleId) && paints(name);
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts and their focus.
	return (
		<header className={cn(PAGE_HEAD, HEAD)}>
			<div className={cn(PAGE_TOP_BAR, ROW)}>
				{goBack}
				{pick}
				<Title
					id={titleId}
					aria-label={waits ? words.waiting : undefined}
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
					<span className={cn(NAME, headed && NAME_WAITS)}>
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
