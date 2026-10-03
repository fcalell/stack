import { useEffect, useState } from "react";
import { toast } from "./toast.ts";
import { useWords } from "./words.tsx";

const COPIED_MS = 2000;

// A copy act's write and its state: `copy(text)` writes to the clipboard and
// sets `done` for two seconds (the act's check and the word Copied). A
// missing clipboard throws inside the chain and a refused one rejects; either
// raises a failed Toast and leaves the act at rest.
export function useCopy(): [done: boolean, copy: (text: string) => void] {
	const words = useWords();
	const [done, setDone] = useState(false);
	useEffect(() => {
		if (!done) return;
		const timer = setTimeout(() => setDone(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [done]);
	const copy = (text: string) => {
		Promise.resolve()
			.then(() => navigator.clipboard.writeText(text))
			.then(
				() => setDone(true),
				() => toast(words.copyFailed, { state: "failed" }),
			);
	};
	return [done, copy];
}
