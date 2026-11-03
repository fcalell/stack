import { trackTime } from "@fcalell/ui-core/player";
import {
	DOCK,
	DOCK_BAR,
	DOCK_TEXT,
	DOCK_TIME,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { player, usePlayer, usePlayerTime } from "../../lib/player";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { PictureTile } from "../image/base";
import { SliderBase } from "../slider/base";

const NOOP = () => {};

// The dock is a column of two bars between the place and the tab bar: the
// transport and the name on the first, the seek on the second. The tab bar below
// it keeps the home indicator clear.
const COLUMN = "flex-col";
const BAR = "flex-row items-center min-w-0";
const TEXT = "grow basis-0 min-w-0";
const FAILED = "text-danger";
const PROGRESS = "flex-row items-center grow basis-0 min-w-0";
const SEEK = "grow basis-0 min-w-0";
const TIME = "shrink-0";
const ELAPSED = "text-right";
const TRANSPORT = "flex-row items-center shrink-0";

/** The player's dock, for a `Shell`'s `foot`: while a track is loaded, its transport, name and seek above the tab bar. It draws what `player` holds and plays nothing itself (the app's `connectOutput` is the sound, and the lock screen's). */
export function Dock() {
	const state = usePlayer();
	const words = useWords();
	const { track } = state;

	if (!track) return null;

	const transport = (
		<View className={cn(TRANSPORT)}>
			{state.queued ? (
				<Button
					glyph
					icon="SkipBack"
					label={words.previous}
					onAct={player.playPrevious}
				/>
			) : null}
			<Button
				glyph
				icon={state.playing ? "Pause" : "Play"}
				label={state.playing ? words.pause : words.play}
				onAct={player.toggle}
			/>
			{state.hasNext ? (
				<Button
					glyph
					icon="SkipForward"
					label={words.next}
					onAct={player.playNext}
				/>
			) : null}
		</View>
	);

	return (
		<View accessibilityLabel={words.player} className={cn(DOCK, COLUMN)}>
			<View className={cn(DOCK_BAR, BAR)}>
				<PictureTile
					src={track.image ?? ""}
					alt={track.title}
					fit="mini"
					box={undefined}
				/>
				<View className={cn(DOCK_TEXT, TEXT)}>
					<RNText
						numberOfLines={1}
						className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
					>
						{track.title}
					</RNText>
					{state.failed ? (
						<RNText
							numberOfLines={1}
							className={cn(text({ role: "meta" }), FAILED)}
						>
							{words.playFailed}
						</RNText>
					) : track.line ? (
						<RNText numberOfLines={1} className={text({ role: "meta" })}>
							{track.line}
						</RNText>
					) : null}
				</View>
				{transport}
				<Button glyph icon="X" label={words.close} onAct={player.close} />
			</View>
			<View className={cn(DOCK_BAR, BAR)}>
				<Progress duration={track.duration} />
			</View>
		</View>
	);
}

// The elapsed time, the seek and the total. The time is its own reader, so only
// this part draws again as the track moves.
function Progress({ duration }: { duration?: number }) {
	const words = useWords();
	const { time, duration: known } = usePlayerTime();
	const length = known > 0 ? known : (duration ?? 0);
	const draft = useHeldDraft(Math.floor(time));
	return (
		<View className={cn(PROGRESS)}>
			<RNText className={cn(DOCK_TIME, TIME, ELAPSED)}>
				{trackTime(time)}
			</RNText>
			<View className={SEEK}>
				<SliderBase
					bare
					label={words.seek}
					draft={draft}
					onChange={NOOP}
					onCommit={player.seek}
					min={0}
					max={Math.max(1, Math.floor(length))}
					step={1}
					said={trackTime}
				/>
			</View>
			<RNText className={cn(DOCK_TIME, TIME)}>{trackTime(length)}</RNText>
		</View>
	);
}
