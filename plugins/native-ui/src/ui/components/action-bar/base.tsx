import { isThenable } from "@fcalell/plugin-api/acts";
import { FIT, kindOf, NO_FAILURE } from "@fcalell/ui-core/action-bar";
import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import { actsSplit } from "@fcalell/ui-core/fold";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR,
	ACTION_BAR_ACTS,
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_SELECTION,
	FIELD_ERROR_LINE,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Act } from "../../lib/act";
import { type Acting, useAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import { ActInert } from "../../lib/form";
import { FadingText, lineIn } from "../../lib/motion";
import { ReasonHostContext } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { PendingBar } from "../banner/pending";
import { ButtonBase } from "../button/base";
import { MenuBase } from "../menu/base";
import { ActSheet } from "../sheet/act";
import type { ActionBarProps } from "./index";

// The touch structure at either fit: one act per row across the container,
// the filled act first.
const ACTS = "flex-col-reverse";
// The count and the acts that choose or clear every row stand a pair apart
// over the acts, one line: of those that apply (choose all while a row is
// unchosen, clear while one is chosen) the first stands, washed at the press,
// and the other is the more menu's (`actsSplit`).
const COUNT = "flex-row items-center";
const ALL = "flex-row items-center shrink-0 active:bg-wash-press";
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
// What a docked foot gives the bar it draws; no app sets it, so it is outside
// `ActionBarProps`.
export interface ActionBarInternal {
	// The bar keeps the reason's line before a reason shows, so showing it never
	// moves the act it describes.
	kept?: boolean;
	// The holder that hosts this bar's acts' run, when the bar is not the only
	// host (a sheet holds its dismissal while its bar's act pends). Absent, the
	// bar hosts its own.
	acting?: Acting<number>;
	// The read the filled act submits waits or stands still: the act paints,
	// inert, in its loaded box.
	painted?: boolean;
	// The read the filled act submits has ended: the act stands blocked under
	// this reason, the failed sentence or `words.missing`.
	ended?: string;
}

function AllAct({ act }: { act: Act }) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={act.onAct}
			className={cn(ACTION_BAR_ALL, ALL)}
		>
			<RNText className={text({ role: "meta" })}>{act.label}</RNText>
		</Pressable>
	);
}

// The count over the acts, with the act that clears the rows while any are
// chosen and the one that chooses every row while some stand unchosen: the
// phone's table has no head tick. The first that applies stands and the other
// is in a more menu.
function Chosen({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const said =
		chosen.noun === undefined
			? filled(words.chosenOf, {
					count: String(chosen.count),
					of: String(chosen.of),
				})
			: filled(words.chosenNounOf, {
					count: String(chosen.count),
					of: String(chosen.of),
					noun: chosen.noun,
				});
	const { onAll } = chosen;
	const entries: Act[] = [];
	if (onAll && chosen.count < chosen.of)
		entries.push({ label: words.chooseAll, onAct: () => onAll(true) });
	if (onAll && chosen.count > 0)
		entries.push({ label: words.chooseNone, onAct: () => onAll(false) });
	const { standing, folded } = actsSplit(entries);
	return (
		<View className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<RNText className={cn(text({ role: "meta" }), SHRINK)}>{said}</RNText>
			{standing.map((act) => (
				<AllAct key="all" act={act} />
			))}
			{folded.length > 0 ? (
				<MenuBase label={words.more} title={words.more} items={folded} />
			) : null}
		</View>
	);
}

export function ActionBarBase({
	acts: offered,
	fit,
	chosen,
	pending,
	kept,
	acting: given,
	painted = false,
	ended,
}: ActionBarProps & ActionBarInternal) {
	const where = fit ?? "end";
	const own = useAct<number>("line");
	// A failure draws in the bar's kept line, so it never moves the act; the
	// same line says the connection refused an act.
	const acting = given ?? own;
	// The filled act is the one a read's end blocks. Its sentence is the body's
	// already, so it draws on a press, not at rest.
	const acts =
		ended === undefined
			? offered
			: offered.map((act, at) =>
					at === offered.length - 1 ? { ...act, blocked: ended } : act,
				);
	// The reason a blocked act was pressed under: the press stands while that act
	// is blocked by it (`pressStands`).
	const [pressedUnder, setPressedUnder] = useState<string>();
	const pressed = pressStands(ended, pressedUnder);
	const { touched, leave } = useTouched();
	// A blocked act waits for a touch: inert and silent until it is pressed, or
	// until its form or sheet has taken input; then its reason stands in the line
	// a failure would draw in (the pressed act's, else the last blocked act's).
	// The filled act's, once its read ended, is the body's and draws on a press
	// alone.
	const reasoned = ended === undefined ? acts : acts.slice(0, -1);
	const reason = reasoned.findLast((act) => act.blocked !== undefined)?.blocked;
	const pressedReason = reasoned.some((act) =>
		pressStands(act.blocked, pressedUnder),
	)
		? pressedUnder
		: undefined;
	const standing = pressedReason ?? (touched ? reason : undefined);
	// The line is held unseen from the first render, so the reason standing
	// moves nothing.
	const said = reason ?? ended;
	// The reason this bar last drew: once a line has drawn the bar keeps its box.
	const [held, setHeld] = useState<string>();
	if (said !== undefined && held !== said) setHeld(said);
	const lastAt = acts.length - 1;
	// The press ends the form's edit before the filled act runs, so an act that
	// navigates is not asked; a rejection puts the edit back.
	const ending = (run: () => unknown) => () => {
		leave.press();
		let ran: unknown;
		try {
			ran = run();
		} catch (error) {
			leave.settle(true);
			throw error;
		}
		if (!isThenable(ran)) {
			leave.settle(false);
			return ran;
		}
		return Promise.resolve(ran).then(
			(done) => {
				leave.settle(false);
				return done;
			},
			(error: unknown) => {
				leave.settle(true);
				throw error;
			},
		);
	};
	const press = (act: Act, at: number) =>
		acting.run(at, {
			...act,
			onAct: at === lastAt && act.onAct ? ending(act.onAct) : act.onAct,
		});
	// The bar under a `PendingBar` is drawn with no act that presses.
	const shown = acting.line !== undefined || standing !== undefined || pressed;
	const line =
		acting.line ??
		standing ??
		(pressed ? ended : undefined) ??
		held ??
		NO_FAILURE;
	const bar = (ghost: boolean) => (
		<View className={cn(ACTION_BAR, chosen && ACTION_BAR_SELECTION)}>
			{chosen ? <Chosen chosen={chosen} /> : null}
			<View className={cn(ACTION_BAR_ACTS, ACTS)}>
				{acts.map((act, at) => {
					const last = at === lastAt;
					const running = acting.pending === at;
					return (
						<ReasonHostContext.Provider
							key={act.label}
							value={{ press: () => setPressedUnder(act.blocked) }}
						>
							<ActInert.Provider value={ghost || (acting.holds && !running)}>
								<ButtonBase
									act={kindOf(act, last)}
									fit={FIT[where]}
									label={act.label}
									onAct={() => press(act, at)}
									pending={running}
									blocked={act.blocked}
									painted={last && painted}
								/>
							</ActInert.Provider>
						</ReasonHostContext.Provider>
					);
				})}
				{ghost ? null : (
					<ActSheet acting={acting} of={(at) => acts[at]?.sheet} />
				)}
			</View>
			{!(held !== undefined || kept || acting.line !== undefined) ? null : (
				<FadingText
					// The kept line holds its room unseen; shown, or with new words, only its
					// text fades in.
					key={shown ? line : "kept"}
					entering={shown ? lineIn() : undefined}
					accessibilityElementsHidden={!shown}
					importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
					className={cn(
						acting.pending === undefined &&
							!pressed &&
							(acting.line !== undefined || standing === undefined)
							? FIELD_ERROR_LINE
							: text({ role: "meta" }),
						!shown && KEPT,
					)}
				>
					{line}
				</FadingText>
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
