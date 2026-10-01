import type { Act } from "@fcalell/ui-core/descriptors";
import {
	ACTION_BAR_ACTS,
	type ActionBarFit,
	actionBar,
	type ButtonAct,
	type ButtonFit,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormContext } from "../../lib/form";
import { Button } from "../button";

// The touch structure at either fit: one act per row across the container,
// the filled act first.
const ACTS = "flex-col-reverse";
const FIT: Record<ActionBarFit, ButtonFit> = { end: "body", full: "field" };

// The last act is the one filled act; a destructive act draws `danger`
// filled and the hairline `destructive` otherwise.
function kindOf(act: Act, last: boolean): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	return last ? "primary" : "secondary";
}

export interface ActionBarProps extends Closed {
	acts: Act[];
	fit?: ActionBarFit;
}

// The acts that close a form, a sheet or a confirm, stacked across the
// container with the filled act on top. A Screen pins it above the home
// indicator; a Form or a Sheet keeps it in flow. A promise the filled act's
// `onAct` returns keeps it pending until it settles, and the others ignore
// the press meanwhile; a blocked act says its reason under itself.
export function ActionBar({ acts, fit }: ActionBarProps) {
	const where = fit ?? "end";
	const pend = useContext(FormContext);
	const [running, setRunning] = useState(false);
	const busy = running || acts.some((act) => act.loading);
	const filled = acts.length - 1;
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
		<View className={actionBar({ fit: where })}>
			<View className={cn(ACTION_BAR_ACTS, ACTS)}>
				{acts.map((act, at) => {
					const last = at === filled;
					const loading = act.loading === true || (last && running);
					const run = last ? runFilled : act.onAct;
					return (
						<Button
							key={act.label}
							act={kindOf(act, last)}
							fit={FIT[where]}
							label={act.label}
							onAct={busy && !loading ? undefined : run}
							loading={loading}
							blocked={act.blocked}
						/>
					);
				})}
			</View>
		</View>
	);
}
