import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import { waitCount } from "@fcalell/ui-core/list-state";
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
	FIELD_ERROR_LINE,
	text,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormStands } from "../../lib/form";
import { LoadingContext } from "../../lib/loading";
import {
	ActFailed,
	REASON_AT_REST,
	ReasonHostContext,
	ReasonKept,
} from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { ActionBarWait } from "./wait";

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
// A kept failure line holds its height while nothing failed.
const KEPT = "opacity-0";
// A kept failure line's text while nothing failed: a no-break space holds the
// line's height.
const NO_FAILURE = " ";

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
	// (the default inside a `Gate`).
	fit?: ActionBarFit;
	// A selection bar's count, "N of M chosen" at meta over the acts (a
	// `Table`'s `choose` set against its rows), with
	// `onAll` a select-all and a deselect-all act beside it. Docked as a
	// `Place`'s `foot`, its column centred in it.
	chosen?: ChosenCount;
	// The acts wait: a count of act-shaped bars, `true` standing for one (the
	// acts are unknown before the read, so give `acts` as `[]`). A number from 1
	// is the count of acts the bar will hold, and 0 or `false` is not waiting,
	// so `loading={rows?.length}` reads the loaded bar at 0. Unset, a loading
	// `Group` or `Section` around it makes it wait, as one act: it hands down a
	// boolean, so set the count on the bar itself.
	loading?: boolean | number;
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

// The count over the acts, with the act that clears the rows while any are
// chosen and the one that chooses every row while some stand unchosen: the
// phone's table has no head tick.
function Chosen({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const said = filled(words.chosenOf, {
		count: String(chosen.count),
		of: String(chosen.of),
	});
	const { onAll } = chosen;
	return (
		<View className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<RNText className={text({ role: "meta" })}>{said}</RNText>
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

// The acts that close a form, a sheet or a confirm, stacked across the
// container with the filled act on top. A Screen pins it above the home
// indicator; a Form or a Sheet keeps it in flow. A promise the filled act's
// `onAct` returns keeps it pending until it settles, and the others ignore
// the press meanwhile. The last blocked act's reason stands at rest under the
// acts, so the act keeps its row and stretches as a live one does. With `chosen` the count
// stands over the acts at the bar's start.
export function ActionBar({ acts, fit, chosen, loading }: ActionBarProps) {
	// Inside a `Gate` a bar with no `fit` stands across the column.
	const inColumn = useContext(FormStands) === "auth";
	const where = fit ?? (inColumn ? "full" : "end");
	const kept = useContext(ReasonKept);
	const failed = useContext(ActFailed);
	// The last blocked act's reason takes the line a failure would draw in.
	const reason = acts.findLast((act) => act.blocked !== undefined)?.blocked;
	const [running, setRunning] = useState(false);
	const { leave } = useTouched();
	const busy = running || acts.some((act) => act.loading);
	const waits = waitCount(loading, useContext(LoadingContext), 1);
	const lastAt = acts.length - 1;
	if (waits !== undefined) return <ActionBarWait fit={where} count={waits} />;
	const runFilled = () => {
		// The press ends the form's edit before the act runs, so an act that
		// navigates is not asked; a rejection puts the edit back.
		leave.press();
		let ran: unknown;
		try {
			ran = acts[lastAt]?.onAct();
		} catch (error) {
			leave.settle(true);
			throw error;
		}
		if (!(ran instanceof Promise)) {
			leave.settle(false);
			return;
		}
		setRunning(true);
		// Settled either way, so a failing act leaves no derived promise to
		// reject unhandled: its rejection stays the caller's.
		const done = (rejected: boolean) => () => {
			leave.settle(rejected);
			setRunning(false);
		};
		void ran.then(done(false), done(true));
	};
	return (
		<View
			className={cn(actionBar({ fit: where }), chosen && ACTION_BAR_SELECTION)}
		>
			{chosen ? <Chosen chosen={chosen} /> : null}
			<ReasonHostContext.Provider value={REASON_AT_REST}>
				<View className={cn(ACTION_BAR_ACTS, ACTS)}>
					{acts.map((act, at) => {
						const last = at === lastAt;
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
			</ReasonHostContext.Provider>
			{reason === undefined ? null : (
				<RNText className={text({ role: "meta" })}>{reason}</RNText>
			)}
			{reason !== undefined || !(kept || failed !== undefined) ? null : (
				<RNText className={cn(FIELD_ERROR_LINE, failed === undefined && KEPT)}>
					{failed ?? NO_FAILURE}
				</RNText>
			)}
		</View>
	);
}
