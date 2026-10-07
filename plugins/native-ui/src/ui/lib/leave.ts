import type { Leave } from "@fcalell/ui-core/leave";
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { ask } from "./confirm";
import { useWords } from "./words";

// While a `Form` stands edited, leaving its screen (the back, a swipe, a
// navigate) asks once: discard the edit, or keep editing. The screen's
// `beforeRemove` is prevented, the decision queue asks, and a discard
// dispatches the action the navigation had. The question is the decision
// queue's, so the app passes nothing.
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	const navigation = useNavigation();
	useEffect(() => {
		if (!guarded) return;
		return navigation.addListener("beforeRemove", (event) => {
			if (!leave.asks()) return;
			event.preventDefault();
			const { action } = event.data;
			void leave
				.attempt(() =>
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
				)
				.then((go) => {
					if (go) navigation.dispatch(action);
				});
		});
	}, [leave, guarded, words, navigation]);
}
