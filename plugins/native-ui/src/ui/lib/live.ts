import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform } from "react-native";

// The one place a phone component tells assistive tech about a change: a live
// region for the text it holds. Android announces a change of the view
// carrying `accessibilityLiveRegion`; iOS has no live region, so a change of
// the text is announced by hand, once. An empty text is silence. The text
// that stands as the view opens is read, never announced, unless `appears`:
// the component is itself the news (a toast, a banner, a pending bar) and its
// text is announced as it mounts, once, whatever StrictMode runs twice.
// `undefined` waits: the next text stands as the baseline, unannounced (a
// log whose first messages are only loading). `assertive` interrupts ongoing
// speech, as `accessibilityLiveRegion` and iOS's high priority do.
// The props go on the view that holds the text.
export function useLive(
	text: string | undefined,
	{ assertive = false, appears = false } = {},
) {
	// `null`: nothing taken yet, so the first text is news.
	const last = useRef<string | undefined | null>(appears ? null : text);
	useEffect(() => {
		const before = last.current;
		last.current = text;
		if (text === undefined || text === "" || before === undefined) return;
		if (before === text || Platform.OS !== "ios") return;
		if (assertive)
			AccessibilityInfo.announceForAccessibilityWithOptions(text, {
				priority: "high",
			});
		else AccessibilityInfo.announceForAccessibility(text);
	}, [text, assertive]);
	return {
		accessibilityLiveRegion: assertive ? "assertive" : "polite",
	} as const;
}
