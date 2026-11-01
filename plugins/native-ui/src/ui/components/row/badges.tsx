import { factReach } from "@fcalell/ui-core/chart";
import { paintText } from "@fcalell/ui-core/paint";
import {
	BADGE,
	BADGE_LINE,
	BADGE_RING,
	BADGE_RING_CENTRE,
	CODE_NAME,
	chipDot,
	FIGURES,
	icon,
	rowWarningContentTone,
	statusDot,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { type BadgeSpec, loneCode } from "../../lib/facts";
import { Ink } from "../../lib/ink";
import { type blockIn, FadingView } from "../../lib/motion";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";
import { IconBase } from "../icon";
import { StatusDot } from "../status/dot";

// A badge is one box that never breaks inside: a flex line of its glyph and its
// words, the words cut with an ellipsis where the badge is wider than its line
// (one line, `numberOfLines`), never the glyph. It sits at its content's width
// at the line's start (`self-start`), so a badge the line wraps to starts under
// the first, and is as tall as the meta text's line.
const BOX = "flex-row items-center self-start";
const WORDS = "min-w-0 shrink text-ink-meta";
const GLYPH = "shrink-0";
// A badge that is a link or a button washes at the press.
const PRESS = "active:bg-wash-press";
// A badge that arrives on its own is a block: it stands in a wrapper of its
// own that fades it in, at most the line's width.
const ARRIVES = "max-w-full self-start";
const META = cn(text({ role: "meta" }), FIGURES);

type Entering = ReturnType<typeof blockIn>;

/** What a badge does when pressed: a link or a button, its box the press target, reaching the target size by a hit slop. */
export interface BadgePress {
	role: "link" | "button";
	onPress: () => void;
	onPressIn?: () => void;
}

/**
 * One badge: its `children` (a glyph, then the words) in the soft box `BADGE`,
 * named for assistive tech as a whole by `name`, so a screen reader reads the
 * badge as its words and not as the pieces. It takes no press (a press reaches
 * the row under it) unless it has a `press`, which it takes itself, its hit
 * reaching the touch target past the badge's line above and below (`factReach`).
 * `entering` is a block that arrives on its own: it fades in. Outside the
 * package's exports.
 */
export function Badge(props: {
	name: string;
	press?: BadgePress;
	entering?: Entering;
	children: ReactNode;
}) {
	const { name, press, entering, children } = props;
	const box = press ? (
		<Pressable
			accessibilityRole={press.role}
			accessibilityLabel={name}
			onPressIn={press.onPressIn}
			onPress={press.onPress}
			hitSlop={{ top: factReach("touch"), bottom: factReach("touch") }}
			className={cn(BADGE, BOX, PRESS)}
		>
			{children}
		</Pressable>
	) : (
		<View
			accessible
			accessibilityLabel={name}
			pointerEvents="none"
			className={cn(BADGE, BOX)}
		>
			{children}
		</View>
	);
	return entering ? (
		<FadingView entering={entering} className={ARRIVES}>
			{box}
		</FadingView>
	) : (
		box
	);
}

/** A badge's words, in the meta role and the meta ink, one line cut with an ellipsis inside the badge. */
export function BadgeWords({ children }: { children: ReactNode }) {
	return (
		<RNText numberOfLines={1} className={cn(META, WORDS)}>
			{children}
		</RNText>
	);
}

// The glyph a kind of badge starts with: a status's tone mark, the warning in
// its own ink, the lock and a flag in the meta ink, a chip's family dot (none
// for neutral), the required ring outlined with its centre filled. Only a
// glyph carries colour; the words stay in the meta ink.
function Mark({ spec }: { spec: BadgeSpec }) {
	switch (spec.kind) {
		case "status":
			return spec.tone ? <StatusDot tone={spec.tone} /> : null;
		case "warning":
			return (
				<Ink.Provider value={rowWarningContentTone()}>
					<IconBase name="TriangleAlert" fit="meta" stroke="line" />
				</Ink.Provider>
			);
		case "lock":
			return (
				<Ink.Provider value="ink-meta">
					<IconBase name="Lock" fit="meta" stroke="line" />
				</Ink.Provider>
			);
		case "chip":
			return spec.family && spec.family !== "neutral" ? (
				<View className={cn(chipDot({ family: spec.family }), GLYPH)} />
			) : null;
		case "ring":
			return (
				<View className={BADGE_RING}>
					<View className={BADGE_RING_CENTRE} />
				</View>
			);
		case "flag":
			return spec.icon ? (
				<Ink.Provider value="ink-meta">
					<IconBase name={spec.icon} fit="meta" stroke="line" />
				</Ink.Provider>
			) : null;
		default:
			return null;
	}
}

// A painted badge is the loaded badge's box in the paint's fill, its glyph and
// its words as unseen boxes at the loaded size (a word's length), so the
// waiting form takes the room the loaded one will.
function PaintedBadge({ spec, at }: { spec: BadgeSpec; at: number }) {
	const mark =
		spec.kind === "status" ? (
			<View className={cn(statusDot({ tone: "done" }), GLYPH, "opacity-0")} />
		) : spec.kind === "warning" || spec.kind === "lock" ? (
			<View className={cn(icon({ fit: "meta" }), GLYPH, "opacity-0")} />
		) : null;
	return (
		<PaintView
			painted
			{...inertProps(true)}
			className={cn(BADGE, BOX, PAINT_BOX)}
		>
			{mark}
			<RNText numberOfLines={1} className={cn(META, WORDS, "opacity-0")}>
				{paintText(spec.kind === "status" ? "word" : "phrase", at)}
			</RNText>
		</PaintView>
	);
}

/**
 * A badge of a facts line from its spec: its glyph and its words, a lock with
 * an `href` a link (`onOpen` follows it) and every other kind inert. A `{ code }`
 * run in it stands in the mono. `painted` specs draw the filler form, `at` the
 * filler's place among its line's. Outside the package's exports.
 */
export function FactBadge(props: {
	spec: BadgeSpec;
	at?: number;
	entering?: Entering;
	onOpen?: (href: string) => void;
}) {
	const { spec, at = 0, entering, onOpen } = props;
	if (spec.painted) return <PaintedBadge spec={spec} at={at} />;
	const { href } = spec;
	const press: BadgePress | undefined =
		spec.kind === "lock" && href !== undefined && onOpen
			? { role: "link", onPress: () => onOpen(href) }
			: undefined;
	return (
		<Badge name={spec.name} press={press} entering={entering}>
			<Mark spec={spec} />
			{spec.runs.length > 0 ? (
				<BadgeWords>
					<RunText runs={spec.runs} fit="name" />
				</BadgeWords>
			) : null}
		</Badge>
	);
}

/**
 * A row's facts line: whole badges, in the order given, `badge` apart across and
 * down with no separator, wrapping to the next line where the line is out of
 * room. The line takes no press but a linked badge's (`box-none`), the rest of
 * its badges letting a press through to the row's hit; a line of one lone
 * `{ code }` run is no badge (`RowValue`). Outside the package's exports.
 */
export function BadgeLine(props: {
	badges: readonly BadgeSpec[];
	onOpen?: (href: string) => void;
}) {
	const linked = props.badges.some((spec) => spec.href !== undefined);
	return (
		<View
			pointerEvents={linked ? "box-none" : "none"}
			className={cn(BADGE_LINE, "flex-row items-start")}
		>
			{props.badges.map((spec, at) => (
				<FactBadge
					// biome-ignore lint/suspicious/noArrayIndexKey: the badges are one line, in the order the facts gave; a badge is its position
					key={at}
					spec={spec}
					at={at}
					onOpen={props.onOpen}
				/>
			))}
		</View>
	);
}

/** A row's lone `{ code }` fact in the place of the badges: the mono, bare, in the meta ink (a machine name in a row is never boxed). Outside the package's exports. */
export function RowValue({ badges }: { badges: readonly BadgeSpec[] }) {
	const code = loneCode(badges);
	if (code === undefined) return null;
	return <RNText className={cn(META, CODE_NAME)}>{code}</RNText>;
}
