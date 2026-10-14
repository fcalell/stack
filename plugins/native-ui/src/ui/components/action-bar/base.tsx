import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
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
import { cn } from "../../lib/cn";
import { ActFailed, REASON_AT_REST, ReasonHostContext } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { PendingBar } from "../pending-bar";
import type { ActionBarProps } from "./index";

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
// React Native's text does not shrink in a row, so a long word pushes past the
// edge; each word of the count row gives way.
const SHRINK = "shrink";
// A kept failure line holds its height while nothing failed.
const KEPT = "opacity-0";
// A pending bar and the bar it replaces share one row: each is the row's width
// and the second is pulled back over the first, so the row is the taller of the
// two. A percentage margin resolves against the row's width; Tailwind has no
// negative percentage margin class, so the pull is a style.
const HOLD = "flex-row";
const CELL = "w-full";
const OVER = { marginLeft: "-100%" } as const;
const GHOST = "opacity-0";
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

// What a docked foot gives the bar it draws; no app sets it, so it is outside
// `ActionBarProps`.
export interface ActionBarInternal {
	// The bar keeps the reason's line before a reason shows, so showing it never
	// moves the act it describes.
	kept?: boolean;
	// The filled act's data is not here: it paints, inert, in its loaded box (a
	// form's or a sheet's submit while its read waits).
	painted?: boolean;
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
				className={cn(
					text({ role: "meta" }),
					SHRINK,
					!props.applies && ALL_INERT,
				)}
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
			<RNText className={cn(text({ role: "meta" }), SHRINK)}>{said}</RNText>
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

export function ActionBarBase({
	acts,
	fit,
	chosen,
	pending,
	kept,
	painted,
}: ActionBarProps & ActionBarInternal) {
	const where = fit ?? "end";
	const failed = useContext(ActFailed);
	// The last blocked act's reason takes the line a failure would draw in.
	const reason = acts.findLast((act) => act.blocked !== undefined)?.blocked;
	const [running, setRunning] = useState(false);
	// The reason this bar last drew: once a line has drawn the bar keeps its box.
	const [held, setHeld] = useState<string>();
	const { leave } = useTouched();
	if (reason !== undefined && held !== reason) setHeld(reason);
	const busy = running || acts.some((act) => act.loading);
	const lastAt = acts.length - 1;
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
	// The bar under a `PendingBar` is drawn with no act that presses.
	const bar = (ghost: boolean) => (
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
							<ButtonBase
								key={act.label}
								act={kindOf(act, last)}
								fit={FIT[where]}
								label={act.label}
								onAct={ghost || (busy && !loading) ? undefined : run}
								loading={loading}
								blocked={act.blocked}
								painted={last && painted}
							/>
						);
					})}
				</View>
			</ReasonHostContext.Provider>
			{reason === undefined ? null : (
				<RNText className={text({ role: "meta" })}>{reason}</RNText>
			)}
			{reason !== undefined ||
			!(held !== undefined || kept || failed !== undefined) ? null : (
				<RNText
					accessibilityElementsHidden={failed === undefined}
					importantForAccessibility={
						failed === undefined ? "no-hide-descendants" : "auto"
					}
					className={cn(FIELD_ERROR_LINE, failed === undefined && KEPT)}
				>
					{failed ?? held ?? NO_FAILURE}
				</RNText>
			)}
		</View>
	);
	if (pending === undefined) return bar(false);
	return (
		<View className={HOLD}>
			<View
				pointerEvents="none"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				className={cn(CELL, GHOST)}
			>
				{bar(true)}
			</View>
			<View className={CELL} style={OVER}>
				<PendingBar {...pending} />
			</View>
		</View>
	);
}
