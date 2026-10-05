import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { announcement, type Taken } from "./announce";

// The one place a phone component tells assistive tech about a change: a live
// region for the text it holds. Android announces a change of the view
// carrying `accessibilityLiveRegion`; iOS has no live region, so a change of
// the text is announced by hand, once (the rules are `announcement`'s). An
// empty text is silence. The text that stands as the view opens is read, never
// announced, unless `appears`: the component is itself the news (a toast, a
// danger banner) and its text is announced as it mounts, once, whatever
// StrictMode runs twice. `undefined` waits: the next text stands as the
// baseline, unannounced (a log whose first messages are only loading). An
// `id` names what the text belongs to: it is announced when the id changes,
// not the text (a log's newest message, which streams). `assertive`
// interrupts ongoing speech, as `accessibilityLiveRegion` and iOS's high
// priority do. The props go on the view that holds the text.
export function useLive(
	text: string | undefined,
	{
		assertive = false,
		appears = false,
		id,
	}: { assertive?: boolean; appears?: boolean; id?: string } = {},
) {
	// `null`: nothing taken yet, so the first text is news.
	const last = useRef<Taken | null>(appears ? null : { text, id });
	useEffect(() => {
		const said = announcement(last.current, { text, id });
		last.current = { text, id };
		if (said === undefined || Platform.OS !== "ios") return;
		if (assertive)
			AccessibilityInfo.announceForAccessibilityWithOptions(said, {
				priority: "high",
			});
		else AccessibilityInfo.announceForAccessibility(said);
	}, [text, id, assertive]);
	return {
		accessibilityLiveRegion: assertive ? "assertive" : "polite",
	} as const;
}
