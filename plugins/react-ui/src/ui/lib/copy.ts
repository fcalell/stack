import { useEffect, useState } from "react";
import { toast } from "./toast.ts";
import { useWords } from "./words.tsx";

const COPIED_MS = 2000;

// A copy act's write and its state: `copy(text)` writes to the clipboard and
// sets `done` for two seconds from the last copy (the act's check and the
// word Copied). A missing clipboard throws inside the chain and a refused one
// rejects; either raises a failed Toast and leaves the act at rest.
export function useCopy(): [done: boolean, copy: (text: string) => void] {
	const words = useWords();
	// Each copy is its own moment, counted, so the reset restarts on every one.
	const [copied, setCopied] = useState(0);
	useEffect(() => {
		if (copied === 0) return;
		const timer = setTimeout(() => setCopied(0), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);
	const copy = (text: string) => {
		Promise.resolve()
			.then(() => navigator.clipboard.writeText(text))
			.then(
				() => setCopied((count) => count + 1),
				() => toast(words.copyFailed, { state: "failed" }),
			);
	};
	return [copied > 0, copy];
}
