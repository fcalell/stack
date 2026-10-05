import type { Stage, StageEnd, StepState } from "@fcalell/ui-core/descriptors";
import { stagesShown } from "@fcalell/ui-core/list-state";
import {
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
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

const LIST = "min-w-0";
const ROW = "flex-row min-w-0";
// The marks' column is the mark's width, the rail running down its middle.
const MARKS = "items-center shrink-0 w-icon-meta";
// The mark beside a zero-width line of the label's role, so it stands on the
// label's first line.
const MARK = "flex-row justify-center shrink-0";
// The line's column, stretched to the line's height: the rail runs through it
// in two halves around the mark, so no break stands at either side of it.
const MARK_COLUMN = "items-center";
// The done disc centres its check.
const DISC = "items-center justify-center";
const RAIL = "grow w-0";
type RailState = "done" | "ahead";

// The rail below a stage: solid through the done ones.
const railBelow = (state: StepState | "ended"): RailState =>
	state === "done" ? "done" : "ahead";
const WORDS = "flex-1 min-w-0";

export interface StagesProps extends Closed {
	// The stages in order, each done, current or later; a done or current
	// one may carry the moment it was reached.
	steps: readonly Stage[];
	// How the rail ended: the terminal row in place of every stage after the
	// last done one, its reason under its label.
	ended?: StageEnd;
}

function Row(props: {
	state: StepState | "ended";
	mark: ReactNode;
	last: boolean;
	// The rail the row before runs down to this mark; none above the first.
	above?: RailState;
	current?: boolean;
	// What assistive tech reads for the row: its state, label and moment.
	spoken: string;
	children: ReactNode;
}) {
	// A later label is meta text, so its mark stands on a meta line.
	const role = props.state === "later" ? "meta" : "body";
	const below = props.last
		? undefined
		: stageRail({ state: railBelow(props.state) });
	return (
		<View
			accessible
			accessibilityLabel={props.spoken}
			accessibilityState={{ selected: props.current }}
			className={cn(STAGE_ROW, ROW)}
		>
			<View className={MARKS}>
				<View className={MARK}>
					<Strut role={role} />
					<View className={MARK_COLUMN}>
						<View
							className={cn(
								props.above && stageRail({ state: props.above }),
								RAIL,
							)}
						/>
						{props.mark}
						<View className={cn(below, RAIL)} />
					</View>
				</View>
				{props.last ? null : <View className={cn(below, RAIL)} />}
			</View>
			<View className={cn(props.last ? undefined : STAGE_WORDS, WORDS)}>
				{props.children}
			</View>
		</View>
	);
}

// Its stages top to bottom on a hairline rail joining their marks, solid
// through the done stages: a done one a disc with a check and its moment under
// the label, the current one a ring in the accent with its label at 500, a
// later one a hollow ring with its label in meta; an ended rail closes on a
// danger cross, its label and its reason in meta. React Native has no
// current-step role: the current row is the selected one.
export function Stages({ steps, ended }: StagesProps) {
	const words = useWords();
	const shown = stagesShown(steps, ended !== undefined);
	const lastShown = shown.at(-1);
	return (
		<View className={LIST}>
			{shown.map((step, at) => {
				const last = ended === undefined && at === shown.length - 1;
				const before = shown[at - 1];
				let mark = <View className={stageMark({ state: "later" })} />;
				let spoken: string = words.waiting;
				if (step.state === "done") {
					spoken = words.done;
					mark = (
						<View className={cn(stageMark({ state: "done" }), DISC)}>
							<Ink.Provider value={stageContentTone("check")}>
								<Icon name="Check" fit="meta" />
							</Ink.Provider>
						</View>
					);
				}
				if (step.state === "current") {
					spoken = words.active;
					mark = <View className={stageMark({ state: "current" })} />;
				}
				return (
					<Row
						// biome-ignore lint/suspicious/noArrayIndexKey: the stages are fixed-order data that never reorder, so position is the identity
						key={at}
						state={step.state}
						mark={mark}
						last={last}
						above={before && railBelow(before.state)}
						current={step.state === "current"}
						spoken={[spoken, step.label, step.at ? moment(step.at) : undefined]
							.filter(Boolean)
							.join(", ")}
					>
						<RNText className={stage({ state: step.state })}>
							{step.label}
						</RNText>
						{step.at ? (
							<RNText className={text({ role: "meta" })}>
								{moment(step.at)}
							</RNText>
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
					above={lastShown && railBelow(lastShown.state)}
					spoken={[words.failed, ended.label, ended.reason].join(", ")}
				>
					<RNText className={stage({ state: "ended" })}>{ended.label}</RNText>
					<RNText className={text({ role: "meta" })}>{ended.reason}</RNText>
				</Row>
			) : null}
		</View>
	);
}
