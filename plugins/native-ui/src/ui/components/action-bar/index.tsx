import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR_ACTS,
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_SELECTION,
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
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { AuthColumnFocus } from "../../lib/field";
import { FormContext } from "../../lib/form";
import { useLive } from "../../lib/live";
import { ReasonHostContext } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Button } from "../button";

// The touch structure at either fit: one act per row across the container,
// the filled act first.
const ACTS = "flex-col-reverse";
const FIT: Record<ActionBarFit, ButtonFit> = { end: "body", full: "field" };
// The count and its choose and clear acts stand a pair apart over the acts; the
// one that does not apply (every row chosen, none chosen) is in the disabled ink.
const COUNT = "flex-row flex-wrap items-center";
const ALL = "flex-row items-center";
const ALL_LIVE = "active:bg-wash-press";
const ALL_INERT = "text-ink-disabled";

// The last act is the one filled act; a destructive act draws `danger`
// filled and the hairline `destructive` otherwise.
function kindOf(act: Act, last: boolean): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	if (act.quiet && !last) return "quiet";
	return last ? "primary" : "secondary";
}

export interface ActionBarProps extends Closed {
	acts: Act[];
	// Where the bar stands: at its container's end (the default), or across it
	// (the default inside an `AuthColumn`).
	fit?: ActionBarFit;
	// A selection bar's count, "N of M chosen" at meta over the acts (a
	// `Table`'s `choose` set against its rows), announced as it changes, with
	// `onAll` a select-all and a deselect-all act beside it. Docked as a
	// `Place`'s `foot`, its column centred in it.
	chosen?: ChosenCount;
}

function AllAct(props: { label: string; applies: boolean; onAct: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: !props.applies }}
			onPress={props.applies ? props.onAct : undefined}
			className={cn(ACTION_BAR_ALL, ALL, props.applies && ALL_LIVE)}
		>
			<RNText
				className={cn(text({ role: "meta" }), !props.applies && ALL_INERT)}
			>
				{props.label}
			</RNText>
		</Pressable>
	);
}

// The count over the acts, a live region that announces as it changes, with the
// act that clears the rows while any are chosen and the one that chooses every
// row while some stand unchosen: the phone's table has no head tick.
function Chosen({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const said = filled(words.chosenOf, {
		count: String(chosen.count),
		of: String(chosen.of),
	});
	const live = useLive(said);
	const { onAll } = chosen;
	return (
		<View className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<RNText {...live} className={text({ role: "meta" })}>
				{said}
			</RNText>
			{onAll !== undefined && chosen.of > 0 ? (
				<>
					<AllAct
						label={words.chooseAll}
						applies={chosen.count < chosen.of}
						onAct={() => onAll(true)}
					/>
					<AllAct
						label={words.chooseNone}
						applies={chosen.count > 0}
						onAct={() => onAll(false)}
					/>
				</>
			) : null}
		</View>
	);
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
	// Inside an `AuthColumn` a bar with no `fit` stands across the column.
	const inColumn = useContext(AuthColumnFocus) !== null;
	const where = fit ?? (inColumn ? "full" : "end");
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
		<View
			className={cn(actionBar({ fit: where }), chosen && ACTION_BAR_SELECTION)}
		>
			{chosen ? <Chosen chosen={chosen} /> : null}
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
