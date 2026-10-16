import { drew, isThenable, refusal, Unreached } from "@fcalell/plugin-api/acts";
import {
	type Datum,
	type Draft,
	useDraft,
	useRun,
} from "@fcalell/plugin-api/tanstack-query";
import type { ActBase } from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import { pressStands } from "@fcalell/ui-core/reason";
import { useState } from "react";
import { usePressed } from "./reason";
import { toast } from "./toast";
import { useWords } from "./words";

// What an act's holder reads: which act pends (inert at once; the pending look
// comes after `ACT_DELAY`), whether it holds its siblings (while one pends),
// the line its failure is drawn in, and the call that runs an act.
export interface Acting<K> {
	pending: K | undefined;
	holds: boolean;
	line: string | undefined;
	run(key: K, act: ActBase): void;
}

/** A holder's run of its acts. `where` is the place a rejection is drawn: the holder's own `line`, or a failed toast whose Retry runs the whole act again. The sentence is the server's refusal, else the generic one; an act refused for the connection draws the generic one too, with no Retry, and the connection's own sentence is the offline banner's alone. */
export function useAct<K = true>(where: "line" | "toast"): Acting<K> {
	const words = useWords();
	const run = useRun<K>();
	const sentenceOf = (error: unknown) => refusal(error) ?? words.actFailed;
	const { pending, failure } = run;
	return {
		pending,
		holds: pending !== undefined,
		line: failure ? sentenceOf(failure.error) : undefined,
		run: (key, act) => {
			run.run(key, () => {
				const result = act.onAct();
				if (where === "line" || !isThenable(result)) return result;
				return Promise.resolve(result).catch((error: unknown) => {
					drew(error);
					toast(sentenceOf(error), {
						state: "failed",
						act:
							error instanceof Unreached
								? undefined
								: { label: words.retry, onAct: act.onAct },
					});
				});
			});
		},
	};
}

// A draft over a read that ended stands with no value and blocked, like an act
// over one: a change changes nothing and `say`s why, where its host draws a
// refusal.
function blocked<T>(
	draft: Draft<T>,
	reason: string | undefined,
	say: (reason: string) => void,
): Draft<T> {
	if (reason === undefined) return draft;
	return {
		...draft,
		change: () => {
			say(reason);
			return undefined;
		},
	};
}

/** A bare control's draft: its rejection toasts, and the toast's Retry saves the same value again. Over a read that ended the control is blocked and the press toasts the read's sentence. A control in a `FormField` is handed the field's draft instead (`useFieldDraft`), so the field's line draws the rejection. */
export function useHeldDraft<T>(value: Datum<T>): Draft<T> {
	const words = useWords();
	const draft = useDraft(value, (error, again) => {
		toast(refusal(error) ?? words.actFailed, {
			state: "failed",
			act: { label: words.retry, onAct: again },
		});
	});
	const reason = endedReason(words, draft.ended);
	// One sentence stands at a time: a drag or a run of keystrokes over it does
	// not stack toasts, and it is said again once its toast has left (or the
	// read has answered).
	const [saidUnder, setSaid] = useState<string>();
	const said = pressStands(reason, saidUnder);
	return blocked(draft, reason, (sentence) => {
		if (said) return;
		setSaid(sentence);
		toast(sentence, { state: "failed", onGone: () => setSaid(undefined) });
	});
}

/** The draft a `FormField` hosts for its control's save, and the line the save's rejection draws in: the latest save's alone, cleared by the next change. Over a read that ended the control is blocked and the line holds the read's sentence once pressed, until the read answers. */
export function useFieldDraft<T>(value: Datum<T>): {
	draft: Draft<T>;
	refused: string | undefined;
} {
	const words = useWords();
	const [refused, refuse] = useState<string>();
	const draft = useDraft(value, (error) =>
		refuse(refusal(error) ?? words.actFailed),
	);
	const reason = endedReason(words, draft.ended);
	const [pressed, press] = usePressed(reason);
	return {
		draft: blocked(
			{
				...draft,
				change: (next, save) => {
					refuse(undefined);
					return draft.change(next, save);
				},
			},
			reason,
			press,
		),
		refused: refused ?? (pressed ? reason : undefined),
	};
}
