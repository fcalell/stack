import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import {
	ACTION_BAR_ACTS,
	type ActionBarFit,
	actionBar,
	type ButtonAct,
	type ButtonFit,
} from "@fcalell/ui-core/variants";
import { use, useEffect, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ActInert, FormContext, SubmitContext } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";

// End: the acts at their width at the container's end. Full: the acts share
// the container's width at the field's height. On touch both stack one act
// per row across the container, the filled act first.
const BAR: Record<ActionBarFit, string> = {
	end: "flex flex-col items-end touch:items-stretch",
	full: "flex flex-col",
};
const ACTS: Record<ActionBarFit, string> = {
	end: "flex items-center justify-end touch:flex-col touch:items-stretch",
	full: "grid grid-flow-col auto-cols-fr touch:flex touch:flex-col",
};
const FIT: Record<ActionBarFit, ButtonFit> = { end: "body", full: "field" };

// The last act is the one filled act; a destructive act draws `danger`
// filled and the hairline `destructive` otherwise.
function kindOf(act: Act, last: boolean): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	return last ? "primary" : "secondary";
}

/** The acts that close a form, a sheet or a confirm. */
export interface ActionBarProps extends Closed {
	/** The acts in reading order, the one filled act last. Inside a `Form` the filled act submits it. A promise the filled act's `onAct` returns keeps it pending until it settles. */
	acts: Act[];
	/** Where the bar stands: at its container's end (the default), or across it with each act at the field's height. */
	fit?: ActionBarFit;
}

/** The acts row over a blocked act's reason; while one act is pending the others ignore the press. */
export function ActionBar({ acts, fit }: ActionBarProps) {
	const where = fit ?? "end";
	const touch = useTouch();
	const pend = use(FormContext);
	const [running, setRunning] = useState(false);
	const { touched } = useTouched();
	const reason = useId();
	const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
	const blockedKey = acts
		.filter((act) => act.blocked !== undefined)
		.map((act) => act.label)
		.join("\n");
	// An act unblocked forgets its press, so a reason blocked again waits for
	// the next one.
	useEffect(() => {
		const blocked = new Set(blockedKey.split("\n"));
		setPressed(
			(was) => new Set([...was].filter((label) => blocked.has(label))),
		);
	}, [blockedKey]);
	const busy = running || acts.some((act) => act.loading);
	const filled = acts.length - 1;
	// The tree holds the acts in drawn order, so Tab follows it: on touch the
	// stack draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch ? ordered.toReversed() : ordered;
	const runFilled = () => {
		const ran = acts[filled]?.onAct();
		if (!(ran instanceof Promise)) return;
		setRunning(true);
		pend?.(true);
		void ran.finally(() => {
			setRunning(false);
			pend?.(false);
		});
	};
	return (
		<div className={cn(actionBar({ fit: where }), BAR[where])}>
			<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
				{drawn.map(([act, at]) => {
					const last = at === filled;
					const loading = act.loading === true || (last && running);
					const run = last ? runFilled : act.onAct;
					const host =
						act.blocked === undefined
							? undefined
							: {
									id: `${reason}-${at}`,
									press: () => setPressed((was) => new Set(was).add(act.label)),
								};
					return (
						<ReasonHostContext key={act.label} value={host}>
							<SubmitContext value={last && pend !== undefined}>
								<ActInert value={busy && !loading}>
									<Button
										act={kindOf(act, last)}
										fit={FIT[where]}
										label={act.label}
										onAct={run}
										loading={loading}
										blocked={act.blocked}
									/>
								</ActInert>
							</SubmitContext>
						</ReasonHostContext>
					);
				})}
			</div>
			{acts.map((act, at) =>
				act.blocked === undefined ? null : (
					<Reason
						key={act.label}
						id={`${reason}-${at}`}
						shown={touched || pressed.has(act.label)}
					>
						{act.blocked}
					</Reason>
				),
			)}
		</div>
	);
}
