import { cn } from "@fcalell/ui-core/cn";
import {
	lineBox,
	METER,
	METER_HEAD,
	METER_ITEM,
	skeleton,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { GroundContext } from "../../lib/ground.ts";

const STACK = "flex flex-col min-w-0";
const HEAD = "flex items-center";
const LINE = "flex items-center h-lh";
const LABEL_WAIT = "grow";
const SHARE_WAIT = "justify-end shrink-0";
const BAR = "w-full";

/** A Meter waiting: the label, share, bar and, when `meta`, the meta line as bars in their line boxes; busy when it waits alone (a list of them is busy once). Outside the package's exports. */
export function MeterWait(props: { busy: boolean; meta: boolean }) {
	// In a Group the meter is one of its items, at the card's inset.
	const item = use(GroundContext) === "group" && METER_ITEM;
	return (
		<div
			aria-busy={props.busy || undefined}
			aria-hidden={props.busy ? undefined : true}
			className={cn(METER, item, STACK)}
		>
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
			{props.meta ? (
				<span className={cn(lineBox({ role: "meta" }), LINE)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</span>
			) : null}
		</div>
	);
}
