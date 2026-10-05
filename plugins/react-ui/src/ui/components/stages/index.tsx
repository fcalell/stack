import { cn } from "@fcalell/ui-core/cn";
import type { Stage, StageEnd, StepState } from "@fcalell/ui-core/descriptors";
import { stagesShown } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	STAGE_CHECK,
	STAGE_CROSS,
	STAGE_ROW,
	STAGE_WORDS,
	stage,
	stageMark,
	stageRail,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { moment } from "../../lib/moment.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const LIST = "flex flex-col min-w-0";
const ROW = "flex min-w-0";
// The marks' column is the mark's width, the rail running down its middle:
// through the mark's own line box too, in its two halves around the mark, so
// no break stands at either side of it.
const MARKS = "flex flex-col items-center shrink-0 w-icon-meta";
const MARK = "flex flex-col items-center h-lh shrink-0";
const SHAPE = "shrink-0";
// A glyph mark (the check on its disc, the cross) centres its icon.
const GLYPH = "flex shrink-0";
const RAIL = "grow w-0";
type RailState = "done" | "ahead";

// The rail below a stage: solid through the done ones.
const railBelow = (state: StepState | "ended"): RailState =>
	state === "done" ? "done" : "ahead";
const WORDS = "flex flex-col min-w-0";

/** A rail of fixed states. */
export interface StagesProps extends Closed {
	/** The stages in order, each done, current or later; a done or current one may carry the moment it was reached. */
	steps: readonly Stage[];
	/** How the rail ended: the terminal row in place of every stage after the last done one, its reason under its label. */
	ended?: StageEnd;
}

function Row(props: {
	state: StepState | "ended";
	mark: ReactNode;
	last: boolean;
	// The rail the row before runs down to this mark; none above the first.
	above?: RailState;
	current?: boolean;
	children: ReactNode;
}) {
	// A later label is meta text, so its mark stands on a meta line.
	const role = props.state === "later" ? "meta" : "body";
	const below = props.last
		? undefined
		: stageRail({ state: railBelow(props.state) });
	return (
		<li
			aria-current={props.current ? "step" : undefined}
			className={cn(STAGE_ROW, ROW)}
		>
			<span className={MARKS}>
				<span className={cn(lineBox({ role }), MARK)}>
					<span
						className={cn(
							props.above && stageRail({ state: props.above }),
							RAIL,
						)}
					/>
					{props.mark}
					<span className={cn(below, RAIL)} />
				</span>
				{props.last ? null : <span className={cn(below, RAIL)} />}
			</span>
			<span className={cn(props.last ? undefined : STAGE_WORDS, WORDS)}>
				{props.children}
			</span>
		</li>
	);
}

/** Its stages top to bottom on a hairline rail joining their marks, solid through the done stages: a done one a disc with a check and its moment under the label, the current one a ring in the accent with its label at 500, a later one a hollow ring with its label in meta; an ended rail closes on a danger cross, its label and its reason in meta. */
export function Stages({ steps, ended }: StagesProps) {
	const words = useWords();
	const shown = stagesShown(steps, ended !== undefined);
	const lastShown = shown.at(-1);
	return (
		<ol className={LIST}>
			{shown.map((step, at) => {
				const last = ended === undefined && at === shown.length - 1;
				const before = shown[at - 1];
				let mark = (
					<span
						role="img"
						aria-label={words.waiting}
						className={cn(stageMark({ state: "later" }), SHAPE)}
					/>
				);
				if (step.state === "done")
					mark = (
						<span
							role="img"
							aria-label={words.done}
							className={cn(stageMark({ state: "done" }), STAGE_CHECK, GLYPH)}
						>
							<Icon name="Check" fit="meta" />
						</span>
					);
				if (step.state === "current")
					mark = (
						<span
							role="img"
							aria-label={words.active}
							className={cn(stageMark({ state: "current" }), SHAPE)}
						/>
					);
				return (
					<Row
						// biome-ignore lint/suspicious/noArrayIndexKey: the stages are fixed-order data that never reorder, so position is the identity
						key={at}
						state={step.state}
						mark={mark}
						last={last}
						above={before && railBelow(before.state)}
						current={step.state === "current"}
					>
						<span className={stage({ state: step.state })}>{step.label}</span>
						{step.at ? (
							<time dateTime={step.at} className={text({ role: "meta" })}>
								{moment(step.at)}
							</time>
						) : null}
					</Row>
				);
			})}
			{ended ? (
				<Row
					state="ended"
					mark={
						<span
							role="img"
							aria-label={words.failed}
							className={cn(STAGE_CROSS, GLYPH)}
						>
							<Icon name="X" fit="meta" />
						</span>
					}
					last
					above={lastShown && railBelow(lastShown.state)}
				>
					<span className={stage({ state: "ended" })}>{ended.label}</span>
					<span className={text({ role: "meta" })}>{ended.reason}</span>
				</Row>
			) : null}
		</ol>
	);
}
