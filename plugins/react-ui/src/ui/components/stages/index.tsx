import { cn } from "@fcalell/ui-core/cn";
import type { Stage, StageEnd, StepState } from "@fcalell/ui-core/descriptors";
import { stagesShown } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	STAGE_CHECK,
	STAGE_RAIL,
	STAGE_ROW,
	STAGE_WORDS,
	stage,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { moment } from "../../lib/moment.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { StatusDot } from "../status/dot.tsx";

const LIST = "flex flex-col min-w-0";
const ROW = "flex min-w-0";
// The marks' column is the check's width, the rail running down its middle.
const MARKS = "flex flex-col items-center shrink-0 w-icon-meta";
const MARK = "flex items-center justify-center h-lh shrink-0";
const CHECK = "flex shrink-0";
const RAIL = "grow w-0";
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
	current?: boolean;
	children: ReactNode;
}) {
	// A later label is meta text, so its mark stands on a meta line.
	const role = props.state === "later" ? "meta" : "body";
	return (
		<li
			aria-current={props.current ? "step" : undefined}
			className={cn(STAGE_ROW, ROW)}
		>
			<span className={MARKS}>
				<span className={cn(lineBox({ role }), MARK)}>{props.mark}</span>
				{props.last ? null : <span className={cn(STAGE_RAIL, RAIL)} />}
			</span>
			<span className={cn(props.last ? undefined : STAGE_WORDS, WORDS)}>
				{props.children}
			</span>
		</li>
	);
}

/** Its stages top to bottom on a hairline rail joining their marks: a done one a check with its moment under the label, the current one the active dot with its label at 500, a later one a hollow dot with its label in meta; an ended rail closes on the failed dot, its label and its reason in meta. */
export function Stages({ steps, ended }: StagesProps) {
	const words = useWords();
	const shown = stagesShown(steps, ended !== undefined);
	return (
		<ol className={LIST}>
			{shown.map((step, at) => {
				const last = ended === undefined && at === shown.length - 1;
				let mark = <StatusDot state="idle" label={words.waiting} />;
				if (step.state === "done")
					mark = (
						<span
							role="img"
							aria-label={words.done}
							className={cn(STAGE_CHECK, CHECK)}
						>
							<Icon name="Check" fit="meta" />
						</span>
					);
				if (step.state === "current")
					mark = <StatusDot state="active" label={words.active} />;
				return (
					<Row
						// biome-ignore lint/suspicious/noArrayIndexKey: the stages are fixed-order data that never reorder, so position is the identity
						key={at}
						state={step.state}
						mark={mark}
						last={last}
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
					mark={<StatusDot state="failed" label={words.failed} />}
					last
				>
					<span className={stage({ state: "ended" })}>{ended.label}</span>
					<span className={text({ role: "meta" })}>{ended.reason}</span>
				</Row>
			) : null}
		</ol>
	);
}
