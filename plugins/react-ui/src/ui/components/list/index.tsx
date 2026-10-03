import { cn } from "@fcalell/ui-core/cn";
import {
	LIST,
	lineBox,
	ROW_TITLE_LINE,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { LoadingContext, LoadingRow } from "../../lib/loading.ts";

const STACK = "flex flex-col";
const ROW_WAIT = "flex items-center";
const AVATAR_WAIT = "shrink-0";
const LINES_WAIT = "flex flex-col grow min-w-0";
// The loading rows' bars, a name over a line, each at the length of the line
// it stands in for.
const BARS = [
	["w-1/2", "w-1/3"],
	["w-2/3", "w-1/4"],
	["w-3/4", "w-1/3"],
	["w-1/2", "w-1/4"],
] as const;
// A row with a trailing value and no leading: its title's bar beside the
// trailing's, over its meta's, each in its line's box.
const LINES = "flex flex-col grow min-w-0";
const TITLE_LINE = "flex items-center h-lh";
const TITLE_SLOT = "flex grow min-w-0";
const META_LINE = "flex items-center h-lh";
const TRAILING_WAIT = "shrink-0";
const TRAILING_BARS = [
	["w-1/2", "w-3/4"],
	["w-2/3", "w-1/2"],
	["w-1/3", "w-2/3"],
	["w-1/2", "w-1/2"],
	["w-2/3", "w-3/4"],
] as const;

/** Rows on the ground, no box and no hairlines. */
export interface ListProps extends Closed {
	/** The rows wait (a loading Section's body waits with it): skeleton two-line rows stand in for them. */
	loading?: boolean;
	/** The rows. */
	children?: ReactNode;
}

/** Rows on the ground at the rows rhythm, with no box and no hairlines: a feed. */
export function List({ loading, children }: ListProps) {
	const inherited = use(LoadingContext);
	const waiting = loading ?? inherited;
	const shape = use(LoadingRow);
	// A loading Section is busy once: rows drawn on its word say nothing.
	return (
		<div aria-busy={loading || undefined} className={cn(LIST, STACK)}>
			{waiting && shape === "two-line-trailing"
				? TRAILING_BARS.map(([title, meta]) => (
						<div
							key={`${title} ${meta}`}
							aria-hidden
							className={cn(
								skeletonRow({ kind: "two-line-trailing" }),
								ROW_WAIT,
							)}
						>
							<span className={LINES}>
								<span
									className={cn(
										ROW_TITLE_LINE,
										lineBox({ role: "body" }),
										TITLE_LINE,
									)}
								>
									<span className={TITLE_SLOT}>
										<span className={cn(skeleton({ kind: "line" }), title)} />
									</span>
									<span
										className={cn(
											skeleton({ kind: "line" }),
											"w-1/4",
											TRAILING_WAIT,
										)}
									/>
								</span>
								<span className={cn(lineBox({ role: "meta" }), META_LINE)}>
									<span className={cn(skeleton({ kind: "line" }), meta)} />
								</span>
							</span>
						</div>
					))
				: waiting
					? BARS.map(([name, line]) => (
							<div
								key={`${name} ${line}`}
								aria-hidden
								className={cn(skeletonRow({ kind: "two-line" }), ROW_WAIT)}
							>
								<span
									className={cn(skeleton({ kind: "avatar" }), AVATAR_WAIT)}
								/>
								<span className={cn(SKELETON_LINES, LINES_WAIT)}>
									<span className={cn(skeleton({ kind: "line" }), name)} />
									<span className={cn(skeleton({ kind: "line" }), line)} />
								</span>
							</div>
						))
					: children}
		</div>
	);
}
