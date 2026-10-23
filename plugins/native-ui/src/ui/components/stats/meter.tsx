import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { CountLink, MeterMark } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { levelOf, type MeterLevel } from "@fcalell/ui-core/list-state";
import { paintText } from "@fcalell/ui-core/paint";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_MARK,
	METER_TRACK,
	meterFill,
	TRAVEL_X,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { I18nManager, Pressable, Text as RNText, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useValue } from "../../lib/motion";
import {
	clipWhen,
	inertProps,
	PAINT_BOX,
	Painted,
	PaintText,
	PaintView,
} from "../../lib/paint";
import { endedSentence, FailedMark, RetryMark, useRow } from "../../lib/read";
import { Decoded } from "../../lib/slot";
import { useWords } from "../../lib/words";
import { CountLinks } from "./count-links";

const STACK = "relative min-w-0";
const HEAD = "flex-row items-center";
const LABEL = "flex-1 min-w-0";
const SHARE = "shrink-0";
// A failed meter is one hit over all of it, after its content, taking the
// press wash.
const HIT = "absolute inset-0 active:bg-wash-press";
const END = "flex-row shrink-0 items-center";
const BAR = "relative";
const TRACK = "overflow-hidden";
const TICK = "absolute";
// The tick rides a box as wide as the track and travels by transform.
const TRAVEL = "absolute inset-y-0 left-0 w-full";

const FillView = withUniwind(Animated.View);
const TravelView = withUniwind(Animated.View);

// The fill is the whole track scaled from its start to the data's share, so a
// change moves on the UI thread and never lays out. One that mounts grows from
// its start.
function Fill(props: { share: number; level: MeterLevel }) {
	const grown = useValue(Math.min(props.share, 1), 0);
	const scaled = useAnimatedStyle(() => ({
		transform: [{ scaleX: grown.value }],
	}));
	return (
		<FillView
			className={meterFill({ level: props.level })}
			style={[
				{ transformOrigin: I18nManager.isRTL ? "right" : "left" },
				scaled,
			]}
		/>
	);
}

// The mark's tick at its share of the track's width, by transform.
function Travel(props: { share: number }) {
	const at = useValue(Math.min(Math.max(props.share, 0), 1));
	const moved = useAnimatedStyle(() => ({
		transform: [{ translateX: `${at.value * 100}%` }],
	}));
	return (
		<TravelView
			pointerEvents="none"
			className={cn(TRAVEL_X, TRAVEL)}
			style={moved}
		>
			<View className={cn(METER_MARK, TICK)} />
		</TravelView>
	);
}

interface MeterBase extends Closed {
	/** What is measured (a short phrase; truncates). A selection paints, inert, until its read lands. */
	label: Datum<string>;
	// How much is used; past `max` the meter is over.
	value: Datum<number>;
	// The limit.
	max: Datum<number>;
	// A tick across the track at the mark's value: the point the fill turns
	// amber at, in place of the near share.
	mark?: MeterMark;
}

// The line under the bar: words, the counts as links, or both.
interface MeterLine {
	// A line under the bar: the value in words, when it resets (a sentence;
	// wraps).
	meta?: string;
	// The line under the bar as links: counts that lead to their lists.
	counts?: readonly CountLink[];
}

type MeterProps = MeterBase & MeterLine;

// The meter form of a bound stat: the label at body 500 with the share in
// percent at its end, the bar under them filling by the share in the meta ink,
// amber once near full (at its `mark` when it has one) and `danger` once over,
// the line under the bar: the meta, or the counts as links. A `value` or
// `bound` that is a selection paints in its place until its read lands; once
// its read ended the meter stands empty (no share, no fill) in the same box.
// The meter is the frame of the selections it draws: when one failed and no
// enclosing frame holds that read, the label stays, the share slot shows the
// failure mark and the retry icon, the line under the bar reads "This didn't
// load." and pressing the meter retries. React Native has no meter role: it is
// a progress bar. Outside the package's exports.
export function Meter({
	label,
	value,
	max,
	meta,
	counts,
	mark,
	at = 0,
}: MeterProps & { at?: number }) {
	const words = useWords();
	const [l, v, m] = useSelections([label, value, max]);
	const { ended: held, busy, retry } = useRow([label, value, max]);
	// A read that ended leaves the meter empty, unpainted: no share, no track
	// fill, the label standing if its own read answered.
	const ended = [l, v, m].some(
		(one) => one.painted && (one.phase === "failed" || one.phase === "missing"),
	);
	const absent = l.painted || v.painted || m.painted;
	const painted = absent && !ended;
	// The drawn numbers are read only once absence is ruled out: a placeholder
	// is a function proxy.
	const used = absent ? 0 : (v.value as number);
	const limit = absent ? 0 : (m.value as number);
	const share = limit > 0 ? used / limit : 0;
	const markShare = mark && limit > 0 ? mark.value / limit : undefined;
	const percent = formatterFor("number", undefined, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(share);
	// A painted meter is no progress bar: its numbers are not here to be read,
	// and neither are an ended one's.
	const reads = absent
		? {}
		: ({
				accessibilityRole: "progressbar",
				accessibilityLabel: l.value as string,
				accessibilityValue: { min: 0, max: limit, now: Math.min(used, limit) },
			} as const);
	return (
		<View {...inertProps(painted)} {...reads} className={cn(METER, STACK)}>
			<View className={cn(METER_HEAD, HEAD)}>
				<PaintText
					fills="name"
					painted={painted}
					numberOfLines={1}
					{...clipWhen(painted)}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL,
						// A value an ended read left out keeps the loaded line's height
						// and width, nothing drawn, so the meter does not move.
						!painted && l.painted && "opacity-0",
					)}
				>
					{painted ? (
						<Painted role="name" at={at} />
					) : l.painted ? (
						paintText("name", at)
					) : (
						(l.value as string)
					)}
				</PaintText>
				{held ? (
					<View className={END}>
						<FailedMark />
						{held === "failed" ? <RetryMark busy={busy} /> : null}
					</View>
				) : absent && !painted ? (
					<PaintText
						className={cn(text({ role: "meta" }), FIGURES, SHARE, "opacity-0")}
					>
						{paintText("figure", at)}
					</PaintText>
				) : (
					<Decoded
						role="figure"
						at={at}
						painted={painted}
						text={percent}
						of={share}
						className={cn(text({ role: "meta" }), FIGURES, SHARE)}
					/>
				)}
			</View>
			<View className={BAR}>
				<PaintView
					painted={painted}
					className={cn(METER_TRACK, TRACK, painted && PAINT_BOX)}
				>
					{absent ? null : (
						<Fill share={share} level={levelOf(share, markShare)} />
					)}
				</PaintView>
				{markShare !== undefined ? <Travel share={markShare} /> : null}
			</View>
			{held ? (
				<RNText className={text({ role: "meta" })}>
					{endedSentence(words, held)}
				</RNText>
			) : counts ? (
				<CountLinks counts={counts} painted={painted} />
			) : null}
			{!held && meta ? (
				<PaintText
					fills="phrase"
					painted={painted}
					className={text({ role: "meta" })}
				>
					{painted ? <Painted role="phrase" at={at} /> : meta}
				</PaintText>
			) : null}
			{held === "failed" ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${words.retry} ${l.painted ? "" : (l.value as string)}`.trim()}
					onPress={() => {
						if (!busy) void retry();
					}}
					className={HIT}
				/>
			) : null}
		</View>
	);
}
