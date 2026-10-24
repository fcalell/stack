import {
	combine,
	type Datum,
	type Drawn,
	FrameHolds,
	isSelection,
	type Selection,
	useFrameRead,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { endedReason, frameOf } from "@fcalell/ui-core/read";
import type { Words } from "@fcalell/ui-core/tokens";
import { ROW_RETRY, row } from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo } from "react";
import { ButtonBase } from "../components/button/base.tsx";
import { Icon } from "../components/icon/index.tsx";
import { MissingBase } from "../components/missing/base.tsx";
import { Spinner } from "../components/spinner/index.tsx";
import { Text } from "../components/text/index.tsx";
import type { Act, MenuEntry } from "./act.ts";
import { wiringOf } from "./act.ts";
import { type Empty, EmptyBase, type EmptyFit } from "./empty.tsx";
import { useWords } from "./words.tsx";

/** A frame's one subscription to its read (a read or a selection): the form it draws (from its own selection's reads), its count, whether it refetches, whether it holds its read (it draws that read's busy, stale and paused flags), the hashes it and its ancestors hold (`held`, for its body to publish) and the retry. */
export function useFrame(read?: Selection<unknown>) {
	const { state, retry, holding, holds: held } = useFrameRead(read, frameOf);
	return {
		...state,
		holds: holding,
		held,
		retry,
	};
}

export type Frame = ReturnType<typeof useFrame>;

/** The `data-still` a frame's own box carries while its held read has no data and nothing is coming (not asked for, or paused): its painted form stands, and nothing breathes or scrambles in it. */
export const stillOf = (frame: Frame): "" | undefined =>
	frame.holds && frame.form === "still" ? "" : undefined;

/** A collection's subscription to its items: what it draws (the placeholder while its read waits) and its own frame, from its own selection alone, so its failed, missing and empty forms never depend on what stands above it. A constant has no frame to speak of: it draws as given. */
export function useCollection<T>(items: Datum<readonly T[]>) {
	const [drawn] = useSelections([items] as const);
	const frame = useFrame(isSelection(items) ? items : undefined);
	return { drawn: drawn as Drawn<readonly T[]>, frame };
}

/** A row's subscription to the selections it draws (a definition's value and description, a meter's label, value and max): the row is their frame, as a collection is its items'. It holds the one read no enclosing frame holds, so a row outside every frame draws its own failure (`ended`: its read failed or is missing) and its retry, and a row whose read an enclosing frame holds draws nothing of its own: that frame's failed form stands once, in its place. `busy` is the retry running. */
export function useRow(data: readonly unknown[]) {
	// The selection is memoized by the list's identity, as `useSelections`' plan
	// is (the React Compiler gives a literal list that identity).
	const selection = useMemo(() => {
		const drawn = data.filter(isSelection);
		return drawn.length > 0 ? combine(drawn, () => null) : undefined;
	}, [data]);
	const frame = useFrame(selection);
	const ended =
		frame.holds && (frame.form === "failed" || frame.form === "missing")
			? frame.form
			: undefined;
	return { ended, busy: frame.busy, retry: frame.retry };
}

/** The sentence a failed or missing row says under its label. */
export function endedSentence(words: Words, ended: "failed" | "missing") {
	return ended === "failed" ? words.readFailed : words.missing;
}

const FAILED_MARK = "inline-flex shrink-0 items-center text-danger";
const RETRY_MARK =
	"relative flex shrink-0 items-center justify-center text-ink-meta";
// The retry glyph gives way to the spinner after `--act-delay`, as an act's
// glyph does (`animate-act-out`, `animate-act-in`): a retry the server
// answers at once never flashes a spinner.
const RETRY_GLYPH = "animate-act-out";
const RETRY_SPIN =
	"absolute inset-0 flex items-center justify-center animate-act-in";

/** What a failed row draws in its value slot: the alert, in the danger ink. */
export function FailedMark() {
	return (
		<span className={FAILED_MARK}>
			<Icon name="CircleAlert" />
		</span>
	);
}

/** What a failed row draws at its end, where a chevron stands: the retry icon, in its own square, a spinner in its place once the retry has run `--act-delay`. Pressing the row retries. */
export function RetryMark({ busy }: { busy: boolean }) {
	return (
		<span className={cn(ROW_RETRY, RETRY_MARK)}>
			{busy ? (
				<>
					<span className={RETRY_GLYPH}>
						<Icon name="RotateCw" />
					</span>
					<span className={RETRY_SPIN}>
						<Spinner />
					</span>
				</>
			) : (
				<Icon name="RotateCw" />
			)}
		</span>
	);
}

// A control holds its options' read and draws no flags of it: nothing about
// the read's refetching is its to say, so the frame's state is not derived.
const NO_FLAGS = () => null;

/** A control's subscription to its options: what it draws (the placeholder while its read waits, with the phase it stands in) and the retry. It holds the read no frame above holds, so a control in a toolbar outside any frame says its failure itself (`OptionsLine`), but draws no busy or stale flag. A constant draws as given. */
export function useOptions<O>(options: Datum<O>) {
	const [drawn] = useSelections([options] as const);
	const { retry } = useFrameRead(
		isSelection(options) ? options : undefined,
		NO_FLAGS,
	);
	return { drawn: drawn as Drawn<O>, retry };
}

/** What a more menu holds and whether it paints: its own items, or the one blocked item once their read ended. The items are the datum the leaf already subscribed to (`useSelections`); a menu with no items and nothing painting draws no menu. A refusal is the item's own blocked reason, so it toasts or shows as the menu does for any blocked item. */
export function moreMenu(
	words: Words,
	offer: Drawn<readonly MenuEntry[] | undefined>,
): { painted: boolean; items: readonly MenuEntry[] } {
	const ended = offer.painted ? endedReason(words, offer.phase) : undefined;
	if (offer.painted && ended === undefined) return { painted: true, items: [] };
	const own: readonly MenuEntry[] | undefined =
		ended === undefined
			? (offer.value as readonly MenuEntry[] | undefined)
			: endedItems(words, ended);
	return { painted: false, items: own ?? [] };
}

// A blocked act is never pressed; its type still asks for the run.
const NEVER_PRESSED = (): void => undefined;

/** The one blocked item a menu stands as while its read has ended: nothing can be taken from it, and its reason says why. */
export function endedItems(words: Words, reason: string): readonly Act[] {
	return [{ label: words.more, blocked: reason, onAct: NEVER_PRESSED }];
}

/** What the bar that submits a frame's data takes from the frame's own read: whether its filled act paints (the read waits or stands still, so the bar keeps its loaded box) and the reason it stands blocked under (the read failed or is missing). A group's read is not the form's, so it never reaches the bar. */
export function submitOf(words: Words, form: Frame["form"]) {
	return {
		waiting: form === "waiting" || form === "still",
		ended: endedReason(words, form),
	};
}

/** Whether a frame has a body to draw: its failed, missing or empty form, or children that draw. A frame with neither draws no body box, since an empty one only takes its padding. */
export function hasBody(frame: Frame, children: ReactNode): boolean {
	return (
		frame.form === "failed" ||
		frame.form === "missing" ||
		frame.form === "empty" ||
		(children !== undefined && children !== null && children !== false)
	);
}

/** What a frame draws in place of its body, or its body: the failed, missing and empty forms; ready, waiting and idle are the loaded tree, its leaves painting. */
export function FrameBody(props: {
	frame: Frame;
	// What the frame says when its read is empty: the default sentence, none (`sentence: undefined` with an act), or its own.
	empty?: { sentence?: string; act?: Empty["act"] };
	// Where the forms stand: inside the card the frame draws (`part`), or on a
	// card of their own, the frame drawing none.
	fit?: EmptyFit;
	// The forms fill the box they stand in (a canvas's ground).
	fill?: boolean;
	// The kind of record a missing read answers for, wording its sentence (a Pane's).
	noun?: string;
	children?: ReactNode;
}) {
	const { frame, empty, fit = "frame", fill, noun, children } = props;
	const words = useWords();
	if (frame.form === "failed") {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: frame.retry }}
				fill={fill}
			/>
		);
	}
	if (frame.form === "missing")
		return <MissingBase fit={fit} fill={fill} noun={noun} />;
	if (frame.form === "empty") {
		return (
			<EmptyBase
				fit={fit}
				tone="rest"
				fill={fill}
				sentence={empty ? empty.sentence : words.readEmpty}
				act={empty?.act}
			/>
		);
	}
	// The reads this frame holds are not drawn again by a frame in its body.
	return <FrameHolds holds={frame.held}>{children}</FrameHolds>;
}

// The mark fades in after `--wait-delay` like the paint does, so a refetch
// the server answers at once draws nothing a viewer sees; it stands in the
// heading's ink, the size of the glyphs beside it.
const BUSY = "inline-flex shrink-0 items-center text-ink-meta animate-paint";
// The line trails its heading row, so it carries the room under itself.
const LINE = "flex flex-wrap items-center gap-gap pb-gap";
// In a form (the form's rows, a group's) the line is a row of the run.
const LINE_IN_FLOW = cn(row({ state: "rest" }), "flex flex-wrap items-center");

/** A frame's busy mark, after its heading: a spinner while a read it holds refetches or retries, faded in after `WAIT_DELAY`. A frame that holds no read and a frame with no heading draw none. */
export function BusyMark({ frame }: { frame: Frame }) {
	if (!(frame.holds && frame.busy)) return null;
	return (
		<span data-busy="" className={BUSY}>
			<Spinner />
		</span>
	);
}

/** One meta sentence with an optional quiet act after it: what a frame says in its head about its read's state. */
export function StateLine(props: {
	sentence: string;
	act?: Act;
	flow?: boolean;
}) {
	const { sentence, act, flow } = props;
	return (
		<div className={flow ? LINE_IN_FLOW : LINE}>
			<Text role="meta">{sentence}</Text>
			{act ? (
				<ButtonBase
					act="quiet"
					label={act.label}
					onAct={act.onAct}
					{...wiringOf(act)}
				/>
			) : null}
		</div>
	);
}

/** The line under a control whose options have ended: the failed sentence with Retry, or `words.missing`; nothing while they wait, stand still or answered. */
export function OptionsLine(props: {
	drawn: Drawn<unknown>;
	retry: () => Promise<unknown>;
}) {
	const { drawn, retry } = props;
	const words = useWords();
	if (!drawn.painted) return null;
	if (drawn.phase === "failed") {
		return (
			<StateLine
				flow
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: retry }}
			/>
		);
	}
	return drawn.phase === "missing" ? (
		<StateLine flow sentence={words.missing} />
	) : null;
}

/** The line under a frame's heading row when a read it holds has data it could not refresh (stale, with Retry, pending while it runs) or waits for a connection (paused, nothing to press). */
export function FrameLine({
	frame,
	flow,
}: {
	frame: Frame;
	/** The line stands among a form's gapped children, which are its room. */
	flow?: boolean;
}) {
	const words = useWords();
	if (!frame.holds) return null;
	if (frame.stale) {
		return (
			<StateLine
				flow={flow}
				sentence={words.readStale}
				act={{ label: words.retry, onAct: frame.retry }}
			/>
		);
	}
	return frame.paused ? (
		<StateLine flow={flow} sentence={words.readPaused} />
	) : null;
}
