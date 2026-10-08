import { shortHeld } from "@fcalell/ui-core/list-state";
import { useState } from "react";

/** Whether a status's short form draws on a meta line `line` wide (zero until laid out), and `decide`, which reads whether the long form is cut on a line of that width. `key` names the words, and none disables it. The long form is measured by an invisible twin `Text` that wraps (`lines` past one) where the visible one truncates, since a truncated line's report differs between platforms; `shortHeld` keeps the two forms from flipping. */
export function useShort(key: string | undefined, line: number) {
	const [held, hold] = useState<{ key: string; width: number } | null>(null);
	const at = held !== null && held.key === key ? held.width : null;
	const drawn = at !== null && line <= at;
	const decide = (cut: boolean) => {
		if (key === undefined || line === 0) return;
		const next = shortHeld(drawn ? at : null, line, () => cut);
		hold(next === null ? null : { key, width: next });
	};
	return { short: drawn, decide };
}
