import type { Stage, StageEnd } from "@fcalell/ui-core/descriptors";
import { stagesShown } from "@fcalell/ui-core/tokens";
import {
	lineBox,
	STAGE_RAIL,
	STAGE_ROW,
	STAGE_WORDS,
	type StageState,
	stage,
	stageContentTone,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { StatusDot } from "../status/dot";

const LIST = "min-w-0";
const ROW = "flex-row min-w-0";
// The marks' column is the check's width, the rail running down its middle.
const MARKS = "items-center shrink-0 w-icon-meta";
// The mark beside a zero-width line of the label's role, so it stands on the
// label's first line.
const MARK = "flex-row items-center justify-center shrink-0";
const RAIL = "grow w-0";
const WORDS = "flex-1 min-w-0";
const STRUT = "​";

export interface StagesProps extends Closed {
	// The stages in order, each done, current or later; a done or current
	// one may carry the moment it was reached.
	steps: readonly Stage[];
	// How the rail ended: the terminal row in place of every stage after the
	// last done one, its reason under its label.
	ended?: StageEnd;
}

function Row(props: {
	state: StageState;
	mark: ReactNode;
	last: boolean;
	current?: boolean;
	// What assistive tech reads for the row: its state, label and moment.
	spoken: string;
	children: ReactNode;
}) {
	// A later label is meta text, so its mark stands on a meta line.
	const role = props.state === "later" ? "meta" : "body";
	return (
		<View
			accessible
			accessibilityLabel={props.spoken}
			accessibilityState={{ selected: props.current }}
			className={cn(STAGE_ROW, ROW)}
		>
			<View className={MARKS}>
				<View className={MARK}>
					<RNText className={lineBox({ role })}>{STRUT}</RNText>
					{props.mark}
				</View>
				{props.last ? null : <View className={cn(STAGE_RAIL, RAIL)} />}
			</View>
			<View className={cn(props.last ? undefined : STAGE_WORDS, WORDS)}>
				{props.children}
			</View>
		</View>
	);
}

// Its stages top to bottom on a hairline rail joining their marks: a done
// one a check with its moment under the label, the current one the active
// dot with its label at 500, a later one a hollow dot with its label in meta;
// an ended rail closes on the failed dot, its label and its reason in meta.
// React Native has no current-step role: the current row is the selected one.
export function Stages({ steps, ended }: StagesProps) {
	const words = useWords();
	const shown = stagesShown(steps, ended !== undefined);
	return (
		<View className={LIST}>
			{shown.map((step, at) => {
				const last = ended === undefined && at === shown.length - 1;
				let mark = <StatusDot state="idle" />;
				let spoken: string = words.waiting;
				if (step.state === "done") {
					spoken = words.done;
					mark = (
						<Ink.Provider value={stageContentTone()}>
							<Icon name="Check" fit="meta" />
						</Ink.Provider>
					);
				}
				if (step.state === "current") {
					spoken = words.active;
					mark = <StatusDot state="active" />;
				}
				return (
					<Row
						key={step.label}
						state={step.state}
						mark={mark}
						last={last}
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
					mark={<StatusDot state="failed" />}
					last
					spoken={[words.failed, ended.label, ended.reason].join(", ")}
				>
					<RNText className={stage({ state: "ended" })}>{ended.label}</RNText>
					<RNText className={text({ role: "meta" })}>{ended.reason}</RNText>
				</Row>
			) : null}
		</View>
	);
}
