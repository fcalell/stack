import type { Engine } from "@fcalell/ui-core/player";
import {
	type AudioStatus,
	createAudioPlayer,
	setAudioModeAsync,
} from "expo-audio";

const NOOP = () => {};

/**
 * `expo-audio` as the player's sound: one audio player, made when the first track loads and kept, so the sound goes on through navigation, in the background and on the lock screen (play, pause and seek; `expo-audio` does not report the system's Next and Previous). Pass it to `connectOutput` once: `connectOutput(audioOutput())`. The app adds `expo-audio` and its config plugin itself.
 */
export function audioOutput(): Engine {
	return (report) => {
		const sound = createAudioPlayer(null, {
			updateInterval: 250,
			keepAudioSessionActive: true,
		});
		void setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: "doNotMix",
		});
		// A source that has not answered yet: the player's own pause while the file
		// loads is the load, not a pause.
		let fresh = true;
		// Whether the store wants sound, as it last told the output.
		let wanted = false;
		sound.addListener("playbackStatusUpdate", (status: AudioStatus) => {
			if (status.error) {
				report.failed();
				return;
			}
			if (!status.isLoaded) return;
			if (fresh) {
				// The file answered: a seek made before it lands, and a track the store
				// wants playing starts, this status being the load's.
				fresh = false;
				report.metadata();
				if (wanted) sound.play();
				return;
			}
			report.time();
			if (status.didJustFinish) {
				report.ended();
				return;
			}
			// The sound is the truth about whether it runs: the system's controls or an
			// interruption may pause it.
			if (!status.isBuffering) report.state(status.playing);
		});
		return {
			load(track) {
				wanted = false;
				if (!track) {
					sound.pause();
					sound.clearLockScreenControls();
					sound.replace(null);
					return;
				}
				fresh = true;
				sound.replace({ uri: track.src });
				// The system fetches the lock screen's picture itself, from an address
				// alone.
				sound.setActiveForLockScreen(
					true,
					{ title: track.title, artist: track.line, artworkUrl: track.image },
					{ showSeekBackward: true, showSeekForward: true },
				);
			},
			play() {
				wanted = true;
				sound.play();
			},
			pause() {
				wanted = false;
				sound.pause();
			},
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
		};
	};
}
