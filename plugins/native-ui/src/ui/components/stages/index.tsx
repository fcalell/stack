import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Stage, StageEnd, StepState } from "@fcalell/ui-core/descriptors";
import { stagesShown } from "@fcalell/ui-core/list-state";
import { type RailState, railBelow, WAITING } from "@fcalell/ui-core/stages";
import {
	FIGURES,
	STAGE_ROW,
	STAGE_WORDS,
	stage,
	stageContentTone,
	stageMark,
	stageRail,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { blockIn, FadingText, FadingView, lineIn } from "../../lib/motion";
import {
	inertProps,
	PAINT_CONTROL,
	Painted,
	PaintText,
	PaintView,
} from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { Swap } from "../../lib/swap";

import { Icon } from "../icon";

const LIST = "min-w-0";
const ROW = "flex-row min-w-0";
// The marks' column is the mark's width, the rail running down its middle,
// and stands the row's full height over its vertical padding (`-my-gap`): a
// spacer of that padding above the mark, the rail one line from the first
// mark to the last.
const MARKS = "items-center shrink-0 w-icon-meta -my-gap";
// The mark beside a zero-width line of the label's role, so it stands on the
// label's first line.
const MARK = "flex-row justify-center shrink-0";
// The line's column, stretched to the line's height: the rail runs through it
// in two halves around the mark, so no break stands at either side of it.
const MARK_COLUMN = "items-center";
// The done disc centres its check.
const DISC = "items-center justify-center";
const RAIL = "grow w-0";
const LEAD = "h-gap w-0 shrink-0";
const WORDS = "flex-1 min-w-0";

export interface StagesProps extends Closed {
	/** The stages in order, each done, current or later; a done or current one may carry the moment it was reached. A selection paints a rail of later stages, and the rail takes no touch, until its read lands. */
	steps: Datum<readonly Stage[]>;
	// How the rail ended: the terminal row in place of every stage after the
	// last done one, its reason under its label.
	ended?: StageEnd;
}

function Row(props: {
	state: StepState | "ended";
	mark: ReactNode;
	last: boolean;
	// The rail is waiting: its marks are painted.
	painted?: boolean;
	// The rail the row before runs down to this mark; none above the first.
	above?: RailState;
	current?: boolean;
	// The terminal row replacing the later stages: a block that fades in as it
	// mounts.
	block?: boolean;
	children: ReactNode;
}) {
	// A later label is meta text, so its mark stands on a meta line.
	const role = props.state === "later" ? "meta" : "body";
	const below = props.last
		? undefined
		: stageRail({ state: railBelow(props.state) });
	return (
		<FadingView
			entering={props.block ? blockIn() : undefined}
			accessibilityState={{ selected: props.current }}
			className={cn(STAGE_ROW, ROW)}
		>
			<View className={MARKS}>
				<View
					className={cn(props.above && stageRail({ state: props.above }), LEAD)}
				/>
				<View className={MARK}>
					<Strut role={role} />
					<View className={MARK_COLUMN}>
						<View
							className={cn(
								props.above && stageRail({ state: props.above }),
								RAIL,
							)}
						/>
						{/* A stage that advances while shown is a mark change; a waiting rail's switch to its loaded one lands at once. */}
						{props.painted ? (
							props.mark
						) : (
							<Swap id={props.state} scale>
								{props.mark}
							</Swap>
						)}
						<View className={cn(below, RAIL)} />
					</View>
				</View>
				{props.last ? null : <View className={cn(below, RAIL)} />}
			</View>
			<View className={cn(props.last ? undefined : STAGE_WORDS, WORDS)}>
				{props.children}
			</View>
		</FadingView>
	);
}

// Its stages top to bottom on a hairline rail joining their marks, solid
// through the done stages: a done one a disc with a check and its moment under
// the label, the current one a ring in the accent with its label at 500, a
// later one a hollow ring with its label in meta; an ended rail closes on a
// danger cross, its label and its reason in meta. React Native has no
// current-step role: the current row is the selected one.
export function Stages({ steps, ended }: StagesProps) {
	const [drawn] = useSelections([steps]);
	const waits = paints(drawn);
	// An ended read draws no stage; the frame that holds it says why.
	let shown: readonly Stage[] = [];
	if (waits) shown = WAITING;
	else if (!drawn.painted)
		shown = stagesShown(drawn.value, ended !== undefined);
	const lastShown = shown.at(-1);
	return (
		<View {...inertProps(waits)} className={LIST}>
			{shown.map((step, at) => {
				const last = ended === undefined && at === shown.length - 1;
				const before = shown[at - 1];
				let mark = <View className={stageMark({ state: "later" })} />;
				if (waits) {
					mark = (
						<PaintView
							painted
							className={cn(stageMark({ state: "later" }), PAINT_CONTROL)}
						/>
					);
				} else if (step.state === "done") {
					mark = (
						<View className={cn(stageMark({ state: "done" }), DISC)}>
							<Ink.Provider value={stageContentTone("check")}>
								<Icon name="Check" fit="meta" />
							</Ink.Provider>
						</View>
					);
				} else if (step.state === "current") {
					mark = <View className={stageMark({ state: "current" })} />;
				}
				return (
					<Row
						// biome-ignore lint/suspicious/noArrayIndexKey: the stages are fixed-order data that never reorder, so position is the identity
						key={at}
						state={step.state}
						mark={mark}
						painted={waits}
						last={last}
						above={before && railBelow(before.state)}
						current={step.state === "current"}
					>
						<PaintText
							fills="name"
							painted={waits}
							className={stage({ state: step.state })}
						>
							{waits ? <Painted role="name" at={at} /> : step.label}
						</PaintText>
						{step.at ? (
							<FadingText
								entering={lineIn()}
								className={cn(text({ role: "meta" }), FIGURES)}
							>
								{moment(step.at)}
							</FadingText>
						) : null}
					</Row>
				);
			})}
			{ended ? (
				<Row
					state="ended"
					mark={
						<Ink.Provider value={stageContentTone("cross")}>
							<Icon name="X" fit="meta" />
						</Ink.Provider>
					}
					last
					block
					above={lastShown && railBelow(lastShown.state)}
				>
					<RNText className={stage({ state: "ended" })}>{ended.label}</RNText>
					{ended.reason ? (
						<RNText className={text({ role: "meta" })}>{ended.reason}</RNText>
					) : null}
				</Row>
			) : null}
		</View>
	);
}
