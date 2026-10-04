import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { toast } from "./toast";
import { useWords } from "./words";

const COPIED_MS = 2000;

// A copy act's write and its state: `copy(text)` writes to the clipboard and
// sets `done` for two seconds from the last copy (the act's check and the
// word Copied). A missing clipboard module rejects and a refused write
// resolves `false` (the web's); either raises a failed Toast and leaves the
// act at rest.
export function useCopy(): [done: boolean, copy: (text: string) => void] {
	const words = useWords();
	// Each copy is its own moment, counted, so the reset restarts on every one.
	const [copied, setCopied] = useState(0);
	useEffect(() => {
		if (copied === 0) return;
		const timer = setTimeout(() => setCopied(0), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);
	const failed = () => toast(words.copyFailed, { state: "failed" });
	const copy = (text: string) => {
		Clipboard.setStringAsync(text).then(
			(saved) => (saved ? setCopied((count) => count + 1) : failed()),
			failed,
		);
	};
	return [copied > 0, copy];
}
