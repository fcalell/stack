import { createSettle } from "@fcalell/ui-core/settle";
import { DURATION_MS } from "@fcalell/ui-core/tokens";
import {
	AccessibilityInfo,
	AppState,
	LayoutAnimation,
	TextInput,
} from "react-native";

// The settle's motion (the web's view transition): the layout the flip changes
// moves between its two places and fades in over a rung of the duration scale,
// on the `in-out` curve. LayoutAnimation animates frames and opacity alone.
const SETTLE = {
	duration: DURATION_MS.base,
	create: { type: "easeInEaseOut", property: "opacity" },
	update: { type: "easeInEaseOut" },
	delete: { type: "easeInEaseOut", property: "opacity" },
} as const;

// The system's reduced motion, held for the flips (they are not in a render).
let reduced = false;
AccessibilityInfo.isReduceMotionEnabled().then((on) => {
	reduced = on;
});
AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => {
	reduced = on;
});

// The screen's one coordinator (`@fcalell/ui-core/settle`): the switches of a
// frame run together under one layout animation. A viewer typing in a field
// gets the switch at once, so a move never costs the caret.
export const settle = createSettle({
	frame: (run) => requestAnimationFrame(() => run()),
	reduced: () => reduced,
	hidden: () => AppState.currentState !== "active",
	typing: () => TextInput.State.currentlyFocusedInput() != null,
	// A layout animation has no running state to read; the coordinator's own
	// holds from its start until it has finished.
	running: () => false,
	start: (update) => {
		const finished = new Promise<void>((done) => {
			LayoutAnimation.configureNext(SETTLE, done, done);
		});
		update();
		return { finished };
	},
	flush: (run) => run(),
});

// The minimum hold on a read's first write (`timings.waitMin`), handed to
// `QueryProvider` beside `settle`.
export { holdFor } from "@fcalell/ui-core/paint";
