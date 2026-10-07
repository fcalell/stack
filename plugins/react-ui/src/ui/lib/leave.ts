import type { Leave } from "@fcalell/ui-core/leave";
import { useEffect } from "react";
import { ask } from "./confirm.ts";
import { blockLeave } from "./navigate.ts";
import { useWords } from "./words.tsx";

// While a `Form` stands edited, leaving its page (a router navigation, the
// back button, a reload or a closed tab) asks once: discard the edit, or keep
// editing. The question is the decision queue's, so the app passes nothing.
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	useEffect(() => {
		if (!guarded) return;
		return blockLeave(leave, () =>
			ask({
				title: words.discardEdit,
				sentence: words.editUnsaved,
				act: {
					label: words.discard,
					destructive: true,
					onAct: () => Promise.resolve(),
				},
				cancel: words.keepEditing,
			}),
		);
	}, [leave, guarded, words]);
}
