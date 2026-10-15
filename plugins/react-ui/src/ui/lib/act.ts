import { drew, isThenable, refusal } from "@fcalell/plugin-api/acts";
import {
	type Datum,
	type Draft,
	useDraft,
	useRun,
} from "@fcalell/plugin-api/tanstack-query";
import type { ActBase } from "@fcalell/ui-core/descriptors";
import { use, useRef } from "react";
import { FieldRefusal } from "./field.ts";
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

/** Where a save's rejection is drawn: the field's error line when the control stands in a field, else a failed toast whose Retry saves again. `own` is the save's sentence when the server gives no refusal. */
export function useFailed(
	own?: string,
): (error: unknown, again: () => unknown) => void {
	const words = useWords();
	const refuse = use(FieldRefusal);
	return (error, again) => {
		drew(error);
		const sentence = refusal(error) ?? own ?? words.actFailed;
		if (refuse) refuse(sentence);
		else
			toast(sentence, {
				state: "failed",
				act: { label: words.retry, onAct: again },
			});
	};
}

/** A control's draft with its rejections drawn where `useFailed` draws them. The field's refusal is cleared by the next change, so the line is the latest save's alone. */
export function useHeldDraft<T>(value: Datum<T>): Draft<T> {
	const refuse = use(FieldRefusal);
	const draft = useDraft(value, useFailed());
	return {
		...draft,
		change: (next, save) => {
			refuse?.(undefined);
			return draft.change(next, save);
		},
	};
}
