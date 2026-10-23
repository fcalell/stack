import type { Leave } from "@fcalell/ui-core/leave";
import type { Words } from "@fcalell/ui-core/tokens";
import { useEffect } from "react";
import { ask } from "./confirm.ts";
import { blockLeave } from "./navigate.ts";
import { useWords } from "./words.tsx";

// The question a leave asks of an edited form: discard the edit, or keep
// editing. It is the decision queue's, so the app passes nothing; it resolves
// `true` to discard.
export function askDiscard(words: Words): Promise<boolean> {
	return ask({
		title: words.discardEdit,
		sentence: words.editUnsaved,
		act: {
			label: words.discard,
			destructive: true,
		},
		cancel: words.keepEditing,
	});
}

// While a `Form` stands edited, leaving its page (a router navigation, the
// back button, a reload or a closed tab) asks once: discard the edit, or keep
// editing.
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	useEffect(() => {
		if (!guarded) return;
		return blockLeave(leave, () => askDiscard(words));
	}, [leave, guarded, words]);
}
