import {
	type Datum,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	IconAct,
	MenuItem,
	Part,
	Route,
} from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import {
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { backGlyph } from "../../lib/back.ts";
import { ShellSwitcher } from "../../lib/frame.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { Painted } from "../../lib/paint.tsx";
import { partText } from "../../lib/parts.ts";
import {
	BusyMark,
	endedItems,
	type Frame,
	FrameLine,
} from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { SwitcherPick } from "../shell/switcher.tsx";

// The back act stands at the bar's start as Back where the Pane stands alone
// (below `tablet` of the Place, first in it, or covering it), and at its end
// as Close where a Pane stands before it.
const ALONE =
	"hidden place-max-tablet:flex group-first/pane:flex group-data-cover/pane:flex";
const BESIDE =
	"flex place-max-tablet:hidden group-first/pane:hidden group-data-cover/pane:hidden";
const HEAD = "flex flex-col";
// On touch the head carries a step of block padding and the row is the
// title's: it wraps, so acts that do not fit beside the back act, the title's
// floor and the gaps drop whole to a second line, and the back act or the
// switcher reaches the page inset by its start, the acts by their end. The row
// anchors its items to the top, so a 44 px act centres on the title's first line.
const HEAD_TOUCH = "touch:py-inside";
const ROW = "flex items-center touch:flex-wrap touch:items-start";
const START = "touch:-ms-icon-inset";
const ACTS = "flex shrink-0 items-center gap-acts ms-auto touch:-me-icon-inset";
// The heading is the title's line, the busy mark after the title. On touch it
// holds at least two fifths of the row (a structural fraction, never a width),
// with a step of block padding so a wrapped title never butts the head's edges.
const TITLE =
	"flex min-w-0 grow items-center gap-inside touch:min-w-2/5 touch:basis-0 touch:py-inside";
// The title truncates on the desktop; on touch it wraps.
const NAME =
	"min-w-0 truncate touch:overflow-visible touch:whitespace-normal touch:text-clip";

/** A Pane's bar: the back act, the title, the actions and more, and the line of its read's state. It subscribes to the title and the acts itself, so a title or an act's read landing renders the bar and nothing under the Pane's body. Outside the package's exports. */
export function PaneHead(props: {
	/** The title's id, which names the Pane while the title is no filler. */
	titleId: string;
	title: Datum<Part>;
	back?: Route;
	actions?: readonly Datum<IconAct>[];
	more?: Datum<readonly MenuItem[]>;
	/** The Pane's frame, whose busy mark and state line the bar draws. */
	frame: Frame;
}) {
	const { titleId, title, back, actions, more, frame } = props;
	const touch = useTouch();
	const far = use(DistanceContext);
	const words = useWords();
	const switcher = use(ShellSwitcher);
	const [name, overflowAt, ...actionAt] = useSelections([
		title,
		more,
		...(actions ?? []),
	]);
	useDrawsFailure([more, ...(actions ?? [])]);
	const fit = touch ? "body" : "bar";
	const goBack =
		back === undefined ? null : (
			<span className={cn(ALONE, START)}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={back}
				/>
			</span>
		);
	const close =
		back === undefined ? null : (
			<span className={BESIDE}>
				<IconButtonLink icon="X" fit={fit} label={words.close} href={back} />
			</span>
		);
	// On touch the shell's switcher leads a Pane with no way back; on the
	// desktop it stands in the sidebar.
	const pick =
		touch && switcher && back === undefined ? (
			<span className={START}>
				<SwitcherPick switcher={switcher} touch />
			</span>
		) : null;
	// An act is painted, inert, while its own datum waits; a selection's shape
	// is unknown until it lands, so its paint is a bare glyph. One whose read
	// ended stands blocked with the sentence for its name, never a false yes.
	const acts = actionAt.map((one, at) => {
		if (!one.painted) {
			return <IconButton key={one.value.label} {...one.value} fit={fit} />;
		}
		const ended = endedReason(words, one.phase);
		return (
			<IconButtonBase
				// biome-ignore lint/suspicious/noArrayIndexKey: a painted act has no name, and the acts stand in a fixed order
				key={at}
				icon={ended ? "CircleAlert" : "Ellipsis"}
				fit={fit}
				label={ended ?? ""}
				disabled={ended !== undefined}
				painted={ended === undefined}
			/>
		);
	});
	const overflowEnded = overflowAt.painted
		? endedReason(words, overflowAt.phase)
		: undefined;
	const items = overflowEnded
		? endedItems(words, overflowEnded)
		: overflowAt.painted
			? []
			: (overflowAt.value ?? []);
	const overflow =
		overflowAt.painted || items.length ? (
			<MenuBase
				label={words.more}
				title={words.more}
				items={items}
				painted={overflowAt.painted && overflowEnded === undefined}
			/>
		) : null;
	// A painted title is filler, not a heading: it stands as a paragraph of the
	// heading's own look until the title lands.
	const Title = name.painted ? "p" : "h1";
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts and their focus.
	return (
		<header className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM, HEAD_TOUCH, HEAD)}>
			<div className={cn(PAGE_TOP_BAR, ROW)}>
				{goBack}
				{pick}
				<Title id={titleId} className={cn(text({ role: "title" }), TITLE)}>
					<span className={NAME}>
						{name.painted ? <Painted role="title" /> : partText(name.value)}
					</span>
					<BusyMark frame={frame} />
				</Title>
				<span className={ACTS}>
					{acts}
					{overflow}
					{close}
				</span>
			</div>
			<FrameLine frame={frame} />
		</header>
	);
}
