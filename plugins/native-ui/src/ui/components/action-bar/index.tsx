import type { Act } from "@fcalell/ui-core/descriptors";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR_ACTS,
	type ActionBarFit,
	actionBar,
	type ButtonAct,
	type ButtonFit,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormContext } from "../../lib/form";
import { ReasonHostContext } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
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
	// A selection bar's count, "N of M chosen" at meta over the acts (a
	// `Table`'s `choose` set against its rows), announced as it changes. Docked
	// as a `Place`'s `foot`.
	chosen?: { count: number; of: number };
}

// An act's reason host: the same object while the act stays blocked by one
// reason, so the act under it renders only when its own props change.
function ActHost(props: {
	label: string;
	blocked: string | undefined;
	press: (label: string, reason: string) => void;
	children: ReactNode;
}) {
	const { label, blocked, press } = props;
	const host = useMemo(
		() =>
			blocked === undefined
				? undefined
				: { press: () => press(label, blocked) },
		[label, blocked, press],
	);
	return (
		<ReasonHostContext.Provider value={host}>
			{props.children}
		</ReasonHostContext.Provider>
	);
}

// The acts that close a form, a sheet or a confirm, stacked across the
// container with the filled act on top. A Screen pins it above the home
// indicator; a Form or a Sheet keeps it in flow. A promise the filled act's
// `onAct` returns keeps it pending until it settles, and the others ignore
// the press meanwhile. A blocked act's reason draws under the acts, so the
// act keeps its row and stretches as a live one does. With `chosen` the count
// stands over the acts at the bar's start.
export function ActionBar({ acts, fit, chosen }: ActionBarProps) {
	const where = fit ?? "end";
	const words = useWords();
	const pend = useContext(FormContext);
	const [running, setRunning] = useState(false);
	const { touched } = useTouched();
	// Each blocked act's press, by label, as the reason it came under: it
	// stands while the act is blocked by that reason
	// (`@fcalell/ui-core/reason`).
	const [pressed, setPressed] = useState<ReadonlyMap<string, string>>(
		new Map(),
	);
	const press = useCallback(
		(label: string, reason: string) =>
			setPressed((was) => new Map(was).set(label, reason)),
		[],
	);
	const busy = running || acts.some((act) => act.loading);
	const lastAt = acts.length - 1;
	const runFilled = () => {
		const ran = acts[lastAt]?.onAct();
		if (!(ran instanceof Promise)) return;
		setRunning(true);
		pend?.(true);
		// Settled either way, so a failing act leaves no derived promise to
		// reject unhandled: its rejection stays the caller's.
		const done = () => {
			setRunning(false);
			pend?.(false);
		};
		void ran.then(done, done);
	};
	return (
		<View className={actionBar({ fit: where })}>
			{chosen ? (
				<RNText
					accessibilityLiveRegion="polite"
					className={text({ role: "meta" })}
				>
					{filled(words.chosenOf, {
						count: String(chosen.count),
						of: String(chosen.of),
					})}
				</RNText>
			) : null}
			<View className={cn(ACTION_BAR_ACTS, ACTS)}>
				{acts.map((act, at) => {
					const last = at === lastAt;
					const loading = act.loading === true || (last && running);
					const run = last ? runFilled : act.onAct;
					return (
						<ActHost
							key={act.label}
							label={act.label}
							blocked={act.blocked}
							press={press}
						>
							<Button
								act={kindOf(act, last)}
								fit={FIT[where]}
								label={act.label}
								onAct={busy && !loading ? undefined : run}
								loading={loading}
								blocked={act.blocked}
							/>
						</ActHost>
					);
				})}
			</View>
			{acts.map((act) =>
				act.blocked !== undefined &&
				(touched || pressStands(act.blocked, pressed.get(act.label))) ? (
					<RNText key={act.label} className={text({ role: "meta" })}>
						{act.blocked}
					</RNText>
				) : null,
			)}
		</View>
	);
}
