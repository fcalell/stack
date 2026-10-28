import { drew, isThenable, refusal, retries } from "@fcalell/plugin-api/acts";
import {
	type Datum,
	type Draft,
	useDraft,
	useRun,
} from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type {
	ActBase,
	Act as ActData,
	Decision,
	IconName,
	LinkAct,
} from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import { pressStands } from "@fcalell/ui-core/reason";
import { useState } from "react";
import type { ActSheetProps } from "../components/sheet/index.tsx";
import { ask } from "./confirm.ts";
import { navigate } from "./navigate.ts";
import { usePressed } from "./reason.ts";
import { toast } from "./toast.ts";
import { useWords } from "./words.tsx";

export type { ActSheetProps };

// Rejections whose every sentence already stands where it belongs (a form's
// refused values, each under the field it names): the host that ran the act
// draws no line and no toast of its own for one, so the sentence stands once.
const placedErrors = new WeakSet<object>();

/** Marks a rejection whose sentences its own host already draws in place: the act's holder draws no line or toast for it, the act ready again. */
export function placed(error: unknown): void {
	if (typeof error === "object" && error !== null) placedErrors.add(error);
}

function isPlaced(error: unknown): boolean {
	return typeof error === "object" && error !== null && placedErrors.has(error);
}

/** A sheet for an act's `sheet`, typed by the procedure its form submits: `P` is read off the form's `act`, so `onDone` hears that procedure's output and the fields are checked against its input. An act's slot holds acts of different procedures, which a type cannot follow, so the sheet leaves here as the procedure-less `ActSheetProps` the slot takes. */
export function sheetOf<P extends ProcedureCall>(
	sheet: ActSheetProps<P>,
): ActSheetProps {
	// The one place the procedure is forgotten: the host draws the sheet through
	// `Sheet`, which reads the form's own procedure, never this type's.
	return sheet as unknown as ActSheetProps;
}

/** What an act does when pressed, exclusively: it runs (`onAct`) or it opens a modal task (`sheet`: the holder keeps its open state, opens it on the press and closes it on dismiss or once the sheet's submit resolves). A press that opens a sheet runs nothing. */
type Pressed<F> =
	| { onAct: F; sheet?: never }
	| { sheet: ActSheetProps; onAct?: never };

/** An act as the platform draws it: the ui-core act with its `onAct` or the `sheet` it opens. */
export type Act = Omit<ActData, "onAct"> & Pressed<ActData["onAct"]>;
/** A descriptor's acts as the platform draws them: each act (one, or a list of them) widened with the `sheet` it may open. */
export type Sheeted<T> = T extends readonly (infer E)[]
	? readonly Sheeted<E>[]
	: T extends { onAct: infer F }
		? Omit<T, "onAct"> & Pressed<F>
		: T;
/** An act of a slot that requires its glyph. */
export type IconAct = Act & { icon: IconName };
/** What a menu holds: acts that run and links that go. */
export type MenuEntry = Act | LinkAct;

/** The wiring an act carries beside its `onAct`, which a host hands to the control that draws it. */
export interface Wiring {
	confirm?: Decision;
	done?: string;
	to?: string;
	sheet?: ActSheetProps;
}

/** What `run` takes: the `onAct`, its wiring, and the label and `destructive` a `confirm`'s decision draws its act with. */
export type Runnable = Partial<ActBase> &
	Wiring & { label?: string; destructive?: boolean };

/** An act's wiring, as a host hands it to the control that draws the act. */
export function wiringOf(act: Wiring): Wiring {
	return {
		confirm: act.confirm,
		done: act.done,
		to: act.to,
		sheet: act.sheet,
	};
}

// What an act's holder reads: which act pends (inert at once; the pending look
// comes after `ACT_DELAY`), whether it holds its siblings (while one pends),
// the line its failure is drawn in, the call that runs an act, and which act's
// sheet is open (drawn by the holder through `ActSheet`, from that act's current
// `sheet`: the open state is all the holder keeps).
export interface Acting<K> {
	pending: K | undefined;
	holds: boolean;
	line: string | undefined;
	run(key: K, act: Runnable): void;
	sheet: { key: K; open: boolean; close: () => void } | undefined;
}

/** A holder's run of its acts, and the one sequence every act goes through: its `confirm` asked (declined, nothing runs), then its `onAct`, then its `done` toasted, then its `to` followed; an act with a `sheet` opens it instead of running. `where` is the place a rejection is drawn: the holder's own `line`, or a failed toast whose Retry runs the act again (its `onAct`, `done` and `to`, not asked again). The sentence is the server's refusal, else the generic one; a refusal the server answered (a 4xx) has no Retry, as it would answer the same again; an act refused for the connection draws the generic one, with no Retry either, and the connection's own sentence is the offline banner's alone. */
export function useAct<K = true>(where: "line" | "toast"): Acting<K> {
	const words = useWords();
	const run = useRun<K>();
	const [opened, setOpened] = useState<{ key: K; open: boolean }>();
	const sentenceOf = (error: unknown) => refusal(error) ?? words.actFailed;
	const { pending, failure } = run;
	// The act's work: `onAct`, then `done`, then `to`, each once the one before
	// resolved (at once for an `onAct` that returns nothing).
	const work = (act: Runnable): unknown => {
		const result = act.onAct?.();
		const finish = () => {
			if (act.done) toast(act.done);
			if (act.to) navigate(act.to);
		};
		if (!isThenable(result)) {
			finish();
			return result;
		}
		return Promise.resolve(result).then((value) => {
			finish();
			return value;
		});
	};
	const go = (key: K, act: Runnable) => {
		if (act.sheet) {
			setOpened({ key, open: true });
			return;
		}
		run.run(key, () => {
			const result = work(act);
			if (where === "line" || !isThenable(result)) return result;
			return Promise.resolve(result).catch((error: unknown) => {
				drew(error);
				if (isPlaced(error)) return;
				toast(sentenceOf(error), {
					tone: "failed",
					act: retries(error)
						? { label: words.retry, onAct: () => work(act) }
						: undefined,
				});
			});
		});
	};
	return {
		pending,
		holds: pending !== undefined,
		line:
			failure && !isPlaced(failure.error)
				? sentenceOf(failure.error)
				: undefined,
		run: (key, act) => {
			if (!act.confirm) return go(key, act);
			ask({
				...act.confirm,
				act: { label: act.label ?? words.done, destructive: act.destructive },
			}).then((taken) => {
				if (taken) go(key, act);
			});
		},
		sheet: opened && {
			key: opened.key,
			open: opened.open,
			close: () => setOpened({ key: opened.key, open: false }),
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

/** A bare control's draft: its rejection toasts, and the toast's Retry saves the same value again, unless the server refused it (a 4xx). Over a read that ended the control is blocked and the press toasts the read's sentence. A control in a `FormField` is handed the field's draft instead (`useFieldDraft`), so the field's line draws the rejection. */
export function useHeldDraft<T>(value: Datum<T>): Draft<T> {
	const words = useWords();
	const draft = useDraft(value, (error, again) => {
		toast(refusal(error) ?? words.actFailed, {
			tone: "failed",
			act: retries(error) ? { label: words.retry, onAct: again } : undefined,
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
		toast(sentence, { tone: "failed", onGone: () => setSaid(undefined) });
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
