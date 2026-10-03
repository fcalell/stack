import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { toast } from "./toast";
import { useWords } from "./words";

const COPIED_MS = 2000;

// A copy act's write and its state: `copy(text)` writes to the clipboard and
// sets `done` for two seconds (the act's check and the word Copied). A
// missing clipboard module rejects and a refused write resolves `false` (the
// web's); either raises a failed Toast and leaves the act at rest.
export function useCopy(): [done: boolean, copy: (text: string) => void] {
	const words = useWords();
	const [done, setDone] = useState(false);
	useEffect(() => {
		if (!done) return;
		const timer = setTimeout(() => setDone(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [done]);
	const failed = () => toast(words.copyFailed, { state: "failed" });
	const copy = (text: string) => {
		Clipboard.setStringAsync(text).then(
			(saved) => (saved ? setDone(true) : failed()),
			failed,
		);
	};
	return [done, copy];
}
