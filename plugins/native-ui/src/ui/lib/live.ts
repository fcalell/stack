import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform } from "react-native";

// A polite live region for the text it holds. Android announces a change of
// the view carrying `accessibilityLiveRegion`; iOS has no live region, so a
// change of the text is announced by hand. Neither speaks on mount: the
// text that stands as the view opens is read, never announced.
// The props go on the view that holds the text.
export function useLive(text: string) {
	const last = useRef(text);
	useEffect(() => {
		if (last.current === text) return;
		last.current = text;
		if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text);
	}, [text]);
	return { accessibilityLiveRegion: "polite" } as const;
}
