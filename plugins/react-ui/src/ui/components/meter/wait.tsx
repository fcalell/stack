import { cn } from "@fcalell/ui-core/cn";
import type { WaitLine } from "@fcalell/ui-core/list-state";
import {
	LINK_TARGET,
	lineBox,
	METER,
	METER_HEAD,
	skeleton,
} from "@fcalell/ui-core/variants";

const STACK = "flex flex-col min-w-0";
const HEAD = "flex items-center";
const LINE = "flex items-center h-lh";
const COUNTS_LINE = "flex items-center";
const LABEL_WAIT = "grow";
const SHARE_WAIT = "justify-end shrink-0";
const BAR = "w-full";

/** A Meter waiting: the label, share, bar and, when `line` is not `none`, the line under the bar as bars in their boxes (a meta line's, or one count link's target box). Outside the package's exports. */
export function MeterWait(props: { line: WaitLine }) {
	return (
		<div aria-hidden className={cn(METER, STACK)}>
			<div className={cn(METER_HEAD, HEAD)}>
				<span className={cn(lineBox({ role: "body" }), LINE, LABEL_WAIT)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
				</span>
				<span
					className={cn(lineBox({ role: "meta" }), LINE, SHARE_WAIT, "w-1/12")}
				>
					<span className={cn(skeleton({ kind: "line" }), BAR)} />
				</span>
			</div>
			<div className={skeleton({ kind: "meter" })} />
			{props.line === "meta" ? (
				<span className={cn(lineBox({ role: "meta" }), LINE)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</span>
			) : null}
			{props.line === "counts" ? (
				<span className={cn(LINK_TARGET, COUNTS_LINE)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</span>
			) : null}
		</div>
	);
}
