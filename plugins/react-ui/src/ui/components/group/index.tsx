import { cn } from "@fcalell/ui-core/cn";
import {
	GROUP,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { useSectionRows } from "../../lib/section.ts";

const BOX = "flex flex-col overflow-hidden";
const ROW_WAIT = "flex items-center";
const LINES_WAIT = "flex grow min-w-0 flex-col";
const SWITCH_WAIT = "shrink-0";
// The loading rows' bars, a label over a value, each at the length of the
// line it stands in for.
const BARS = [
	["w-1/3", "w-1/4"],
	["w-1/4", "w-1/4"],
	["w-1/3", "w-1/2"],
] as const;

/** Rows in a hairline card. */
export interface GroupProps extends Closed {
	/** The rows wait (a loading Section's body waits with it): skeleton setting rows stand in for them. */
	loading?: boolean;
	/** The rows. */
	children?: ReactNode;
}

/** Rows in a hairline card on the surface, the hairline drawn once between them, so no row carries one. */
export function Group({ loading, children }: GroupProps) {
	useSectionRows();
	const inherited = use(LoadingContext);
	const waiting = loading ?? inherited;
	// A loading Section is busy once: rows drawn on its word say nothing.
	return (
		<div aria-busy={loading || undefined} className={cn(GROUP, BOX)}>
			{waiting ? (
				BARS.map(([label, value]) => (
					<div
						key={`${label} ${value}`}
						aria-hidden
						className={cn(skeletonRow({ kind: "setting" }), ROW_WAIT)}
					>
						<span className={cn(SKELETON_LINES, LINES_WAIT)}>
							<span className={cn(skeleton({ kind: "line" }), label)} />
							<span className={cn(skeleton({ kind: "line" }), value)} />
						</span>
						<span className={cn(skeleton({ kind: "switch" }), SWITCH_WAIT)} />
					</div>
				))
			) : (
				<GroundContext value="group">{children}</GroundContext>
			)}
		</div>
	);
}
