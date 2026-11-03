import { keyOf, trackTime } from "@fcalell/ui-core/player";
import {
	PLAYER,
	PLAYER_ARTWORK,
	PLAYER_BAR,
	PLAYER_TEXT,
	PLAYER_TIME,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	type AudioPlayer,
	type AudioStatus,
	createAudioPlayer,
	setAudioModeAsync,
} from "expo-audio";
import { useEffect, useRef } from "react";
import { Image, Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { player, report, usePlayer, usePlayerTime } from "../../lib/player";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { SliderBase } from "../slider/base";

const NOOP = () => {};

// The dock is a column of two bars between the place and the tab bar: the
// transport and the name on the first, the seek on the second. The tab bar below
// it keeps the home indicator clear.
const DOCK = "flex-col";
const BAR = "flex-row items-center min-w-0";
const ARTWORK = "shrink-0";
const TEXT = "grow basis-0 min-w-0";
const FAILED = "text-danger";
const PROGRESS = "flex-row items-center grow basis-0 min-w-0";
const SEEK = "grow basis-0 min-w-0";
const TIME = "shrink-0";
const ELAPSED = "text-right";
const TRANSPORT = "flex-row items-center shrink-0";

// The one audio player, made when the first track loads and kept: the sound
// goes on through navigation. `expo-audio` plays in the background and under the
// lock screen once its config plugin is in the app config (plugin-native-ui adds
// it).
let engine: AudioPlayer | undefined;

function audio(): AudioPlayer {
	if (!engine) {
		engine = createAudioPlayer(null, {
			updateInterval: 250,
			keepAudioSessionActive: true,
		});
		void setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: "doNotMix",
		});
		const sound = engine;
		report.bind({
			time: () => sound.currentTime,
			length: () =>
				sound.isLoaded && Number.isFinite(sound.duration) && sound.duration > 0
					? sound.duration
					: undefined,
			ready: () => sound.isLoaded,
			seek(to) {
				sound.seekTo(to).catch(NOOP);
			},
			paused: () => !sound.playing,
			level: () => ({ volume: sound.volume, muted: sound.muted }),
			apply(volume, muted) {
				sound.volume = volume;
				sound.muted = muted;
			},
		});
	}
	return engine;
}

/** The dock the Shell draws above the tab bar while a track is loaded: its transport, the name and the seek. It also owns the one audio player the sound comes from and the lock screen's controls (play, pause and seek; the system's Next and Previous are not reported by `expo-audio`). Outside the package's exports. */
export function Player() {
	const state = usePlayer();
	const words = useWords();
	const { track } = state;
	const key = track ? keyOf(track) : undefined;
	// A source that has not answered yet: the player's own pause while the file
	// loads is the load, not a pause.
	const fresh = useRef(true);
	// Whether the store wants sound, as the status listener last saw it.
	const wanted = useRef(false);
	wanted.current = state.playing;

	// The audio player follows the loaded track: its source and its lock screen.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a track is the same track by its key
	useEffect(() => {
		if (!track) {
			if (engine) {
				engine.pause();
				engine.clearLockScreenControls();
				engine.replace(null);
			}
			return;
		}
		const sound = audio();
		fresh.current = true;
		sound.replace({ uri: track.src, headers: track.headers });
		sound.setActiveForLockScreen(
			true,
			{
				title: track.title,
				artist: track.meta,
				artworkUrl: track.artwork,
			},
			{ showSeekBackward: true, showSeekForward: true },
		);
	}, [key]);

	// The player plays when the store says so.
	useEffect(() => {
		if (!track) return;
		const sound = audio();
		if (state.playing) sound.play();
		else sound.pause();
	}, [state.playing, track]);

	// What the sound reports goes to the store.
	useEffect(() => {
		if (!key) return;
		const sound = audio();
		const heard = (status: AudioStatus) => {
			if (status.error) {
				report.failed();
				return;
			}
			if (!status.isLoaded) return;
			if (fresh.current) {
				// The file answered: a seek made before it lands, and a track the
				// store wants playing starts, this status being the load's.
				fresh.current = false;
				report.metadata();
				if (wanted.current) sound.play();
				return;
			}
			report.time();
			if (status.didJustFinish) {
				report.ended();
				return;
			}
			// The sound is the truth about whether it runs: the system's controls
			// or an interruption may pause it.
			if (!status.isBuffering) report.state(status.playing);
		};
		const subscription = sound.addListener("playbackStatusUpdate", heard);
		return () => subscription.remove();
	}, [key]);

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
		<View accessibilityLabel={words.player} className={cn(PLAYER, DOCK)}>
			<View className={cn(PLAYER_BAR, BAR)}>
				{track.artwork ? (
					<Image
						source={{ uri: track.artwork }}
						accessibilityIgnoresInvertColors
						className={cn(PLAYER_ARTWORK, ARTWORK)}
					/>
				) : null}
				<View className={cn(PLAYER_TEXT, TEXT)}>
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
							{words.trackFailed}
						</RNText>
					) : track.meta ? (
						<RNText numberOfLines={1} className={text({ role: "meta" })}>
							{track.meta}
						</RNText>
					) : null}
				</View>
				{transport}
				<Button glyph icon="X" label={words.close} onAct={player.close} />
			</View>
			<View className={cn(PLAYER_BAR, BAR)}>
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
			<RNText className={cn(PLAYER_TIME, TIME, ELAPSED)}>
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
			<RNText className={cn(PLAYER_TIME, TIME)}>{trackTime(length)}</RNText>
		</View>
	);
}
