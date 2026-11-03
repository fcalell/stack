import { cn } from "@fcalell/ui-core/cn";
import type { Track } from "@fcalell/ui-core/descriptors";
import { shortcut, trackTime } from "@fcalell/ui-core/player";
import {
	PLAYER,
	PLAYER_ARTWORK,
	PLAYER_BAR,
	PLAYER_TEXT,
	PLAYER_TIME,
	PLAYER_VOLUME,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useCallback, useEffect, useRef } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import { useTouch } from "../../lib/media.ts";
import { player, report, usePlayer, usePlayerTime } from "../../lib/player.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { SliderBase } from "../slider/base.tsx";
import { Waveform } from "../waveform/index.tsx";

const NOOP = () => {};

// The dock is a column of bars (two on touch) under the place, clear of the
// bottom safe inset.
const DOCK = "flex flex-col pb-safe";
const BAR = "flex items-center min-w-0";
const ARTWORK = "shrink-0 object-cover";
// The name over its meta on the desktop at the popover's width, giving way to
// the seek; on touch it takes the bar's room.
const TEXT = "flex flex-col min-w-0";
const TEXT_DESKTOP = "w-popover shrink";
const TEXT_TOUCH = "grow basis-0";
const LINE = "truncate";
const FAILED = "text-danger";
const PROGRESS = "flex items-center grow basis-0 min-w-0";
const SEEK = "grow basis-0 min-w-0";
const TIME = "shrink-0";
const ELAPSED = "text-end";
const VOLUME = "flex items-center shrink-0";
const TRANSPORT = "flex items-center shrink-0";

// Space and the horizontal arrows are the page's while nothing that takes them
// itself has focus: a field's text, a control a press activates (Space) or a
// widget that moves with the arrows.
// A Table's grid is the widget that moves with the arrows (`role="grid"`), and
// takes Space, Enter and `x` only where it acts on them (it ticks the row of a
// table that chooses): the key it takes arrives here already prevented, and
// Space on a cell of a table that chooses nothing is the player's.
const TEXT_INPUTS = new Set([
	"text",
	"search",
	"email",
	"url",
	"tel",
	"password",
	"number",
	"date",
	"datetime-local",
	"month",
	"time",
	"week",
]);
const PRESSED =
	'button, a[href], summary, select, input:not([type="range"]), [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="option"], [role="treeitem"], [role="gridcell"], [role="row"]';
const ARROWED =
	'select, input, textarea, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="tree"], [role="grid"], [role="radiogroup"], [role="spinbutton"], [role="scrollbar"]';

function typing(target: Element): boolean {
	if (target instanceof HTMLElement && target.isContentEditable) return true;
	if (target instanceof HTMLTextAreaElement) return true;
	return target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type);
}

/** The key, if the player takes it where focus stands. */
function taken(event: KeyboardEvent) {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
		return undefined;
	const target = event.target instanceof Element ? event.target : null;
	if (target && typing(target)) return undefined;
	const key = shortcut(event.key, event.shiftKey);
	if (!key) return undefined;
	if (target?.closest(key.to === "toggle" ? PRESSED : ARROWED))
		return undefined;
	return key;
}

/** The dock the Shell draws under the place while a track is loaded: the one `<audio>` the sound plays from, its transport and its seek. Outside the package's exports. */
export function Player() {
	const state = usePlayer();
	const touch = useTouch();
	const words = useWords();
	const { track } = state;
	const element = useRef<HTMLAudioElement | null>(null);
	const bind = useCallback((audio: HTMLAudioElement | null) => {
		element.current = audio;
		report.bind(audio);
	}, []);

	// The element plays when the player says so; the browser holding the sound
	// back (no press asked for it) leaves the track waiting paused.
	useEffect(() => {
		const audio = element.current;
		if (!audio || !track) return;
		if (!state.playing) {
			audio.pause();
			return;
		}
		audio.play().catch((error: unknown) => {
			const name = error instanceof DOMException ? error.name : "";
			if (name === "NotAllowedError") report.blocked();
			else if (name !== "AbortError") report.failed();
		});
	}, [state.playing, track]);

	useEffect(() => {
		if (!track) return;
		const onKey = (event: KeyboardEvent) => {
			const key = taken(event);
			if (!key) return;
			event.preventDefault();
			if (key.to === "toggle") player.toggle();
			else player.skip(key.by);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [track]);

	// The system's media keys and lock screen drive the same player.
	useEffect(() => {
		if (!track || !("mediaSession" in navigator)) return;
		const session = navigator.mediaSession;
		session.metadata = new MediaMetadata({
			title: track.title,
			artist: track.meta ?? "",
			artwork: track.artwork ? [{ src: track.artwork }] : [],
		});
		session.setActionHandler("play", () => player.play());
		session.setActionHandler("pause", () => player.pause());
		session.setActionHandler(
			"previoustrack",
			state.queued ? () => player.playPrevious() : null,
		);
		session.setActionHandler(
			"nexttrack",
			state.hasNext ? () => player.playNext() : null,
		);
		session.setActionHandler("seekto", (event) => {
			if (event.seekTime !== undefined) player.seek(event.seekTime);
		});
		return () => {
			for (const action of [
				"play",
				"pause",
				"previoustrack",
				"nexttrack",
				"seekto",
			] as const)
				session.setActionHandler(action, null);
			session.metadata = null;
		};
	}, [track, state.queued, state.hasNext]);

	if (!track) return null;

	const transport = (
		<div className={cn(TRANSPORT)}>
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
		</div>
	);
	const close = (
		<Button glyph icon="X" label={words.close} onAct={player.close} />
	);
	const progress = <Progress track={track} />;

	return (
		<aside aria-label={words.player} className={cn(PLAYER, DOCK)}>
			{/* biome-ignore lint/a11y/useMediaCaption: a music track has no captions to draw */}
			<audio
				ref={bind}
				src={track.src}
				preload="metadata"
				onTimeUpdate={report.time}
				onDurationChange={report.time}
				onLoadedMetadata={report.metadata}
				onPlay={() => report.state(true)}
				onPause={(event) => {
					// A pause while the file loads is the element reloading, not a pause.
					if (event.currentTarget.readyState > 0) report.state(false);
				}}
				onVolumeChange={report.volume}
				onEnded={report.ended}
				onError={report.failed}
			/>
			<div className={cn(PLAYER_BAR, BAR)}>
				{track.artwork ? (
					<img
						src={track.artwork}
						alt=""
						className={cn(PLAYER_ARTWORK, ARTWORK)}
					/>
				) : null}
				<div
					className={cn(PLAYER_TEXT, TEXT, touch ? TEXT_TOUCH : TEXT_DESKTOP)}
				>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							LINE,
						)}
					>
						{track.title}
					</span>
					{state.failed ? (
						<span className={cn(text({ role: "meta" }), LINE, FAILED)}>
							{words.trackFailed}
						</span>
					) : track.meta ? (
						<span className={cn(text({ role: "meta" }), LINE)}>
							{track.meta}
						</span>
					) : null}
				</div>
				{transport}
				{touch ? null : progress}
				{touch ? null : <Volume />}
				{touch ? <span className="grow" /> : null}
				{close}
			</div>
			{touch ? <div className={cn(PLAYER_BAR, BAR)}>{progress}</div> : null}
		</aside>
	);
}

// The elapsed time, the seek and the total: the seek is the track's waveform
// where it has peaks, else a slider. The time is its own reader, so only this
// part draws again as the track moves.
function Progress({ track }: { track: Track }) {
	const words = useWords();
	const { time, duration } = usePlayerTime();
	const length = duration > 0 ? duration : (track.duration ?? 0);
	return (
		<div className={cn(PROGRESS)}>
			<span className={cn(PLAYER_TIME, TIME, ELAPSED)}>{trackTime(time)}</span>
			<div className={SEEK}>
				{track.peaks && length > 0 ? (
					<Waveform
						fit="bar"
						label={words.seek}
						peaks={track.peaks}
						duration={length}
						at={time}
						onSeek={player.seek}
						markers={track.markers}
					/>
				) : (
					<Seek time={time} length={length} />
				)}
			</div>
			<span className={cn(PLAYER_TIME, TIME)}>{trackTime(length)}</span>
		</div>
	);
}

function Seek({ time, length }: { time: number; length: number }) {
	const words = useWords();
	const draft = useHeldDraft(Math.floor(time));
	return (
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
	);
}

function Volume() {
	const state = usePlayer();
	const words = useWords();
	const shown = state.muted ? 0 : Math.round(state.volume * 100);
	const draft = useHeldDraft(shown);
	return (
		<div className={VOLUME}>
			<Button
				glyph
				icon={state.muted || shown === 0 ? "VolumeX" : "Volume2"}
				label={state.muted ? words.unmute : words.mute}
				onAct={() => player.mute()}
			/>
			<div className={PLAYER_VOLUME}>
				<SliderBase
					bare
					label={words.volume}
					draft={draft}
					onChange={(value) => player.setVolume(value / 100)}
					min={0}
					max={100}
					step={5}
					unit="percent"
				/>
			</div>
		</div>
	);
}
