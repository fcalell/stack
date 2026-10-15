import { drew, isThenable, refusal } from "@fcalell/plugin-api/acts";
import {
	type Datum,
	type Draft,
	useDraft,
	useRun,
} from "@fcalell/plugin-api/tanstack-query";
import type { ActBase } from "@fcalell/ui-core/descriptors";
import { useRef, useState } from "react";
import { toast } from "./toast.ts";
import { useWords } from "./words.tsx";

// What an act's holder reads: which act pends (inert at once; the pending look
// comes after `ACT_DELAY`), whether it holds its siblings (pending and not
// waiting for a connection), the line its failure or its wait is drawn in, and
// the call that runs an act.
export interface Acting<K> {
	pending: K | undefined;
	holds: boolean;
	line: string | undefined;
	run(key: K, act: ActBase): void;
}

/** A holder's run of its acts. `where` is the place a rejection is drawn: the holder's own `line`, or a failed toast whose Retry runs the whole act again. The sentence is the server's refusal, then the act's own `failed`, then the generic one. */
export function useAct<K = true>(where: "line" | "toast"): Acting<K> {
	const words = useWords();
	const run = useRun<K>();
	const failed = useRef<string>(undefined);
	const sentenceOf = (error: unknown, own: string | undefined) =>
		refusal(error) ?? own ?? words.actFailed;
	const { pending, paused, failure } = run;
	return {
		pending,
		holds: pending !== undefined && !paused,
		line: paused
			? words.readPaused
			: failure
				? sentenceOf(failure.error, failed.current)
				: undefined,
		run: (key, act) => {
			failed.current = act.failed;
			run.run(key, () => {
				const result = act.onAct();
				if (where === "line" || !isThenable(result)) return result;
				return Promise.resolve(result).catch((error: unknown) => {
					drew(error);
					toast(sentenceOf(error, act.failed), {
						state: "failed",
						act: { label: words.retry, onAct: act.onAct, failed: act.failed },
					});
				});
			});
		},
	};
}

/** A bare control's draft: its rejection toasts, and the toast's Retry saves the same value again. A control in a `FormField` is handed the field's draft instead (`useFieldDraft`), so the field's line draws the rejection. */
export function useHeldDraft<T>(value: Datum<T>): Draft<T> {
	const words = useWords();
	return useDraft(value, (error, again) => {
		toast(refusal(error) ?? words.actFailed, {
			state: "failed",
			act: { label: words.retry, onAct: again },
		});
	});
}

/** The draft a `FormField` hosts for its control's save, and the line the save's rejection draws in: the latest save's alone, cleared by the next change. */
export function useFieldDraft<T>(value: Datum<T>): {
	draft: Draft<T>;
	refused: string | undefined;
} {
	const words = useWords();
	const [refused, refuse] = useState<string>();
	const draft = useDraft(value, (error) =>
		refuse(refusal(error) ?? words.actFailed),
	);
	return {
		draft: {
			...draft,
			change: (next, save) => {
				refuse(undefined);
				return draft.change(next, save);
			},
		},
		refused,
	};
}
