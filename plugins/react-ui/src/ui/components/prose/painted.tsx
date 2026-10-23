import { cn } from "@fcalell/ui-core/cn";
import { PROSE, PROSE_BLOCKS, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";

// The loaded column's boxes (Prose's own).
const COLUMN = "flex flex-col min-w-0";
const STACK = "flex flex-col";
// One painted line is a line box of the paragraph, clipped where it ends: the
// text's length is the data's and unknown, so a bar that wraps would stand
// taller than the text that lands.
const PAINTED_LINE = "block overflow-hidden whitespace-nowrap";

/** A markdown text that is not here, in the column's box, inert: `rows` paragraphs of filler, or, given `lines`, `rows` paragraphs of that many clipped lines (a Prose paints one paragraph of `PAINT_ROWS` lines: a text block of unknown length paints that many lines). Outside the package's exports: a Message's reply paints one paragraph of filler. */
export function PaintedProse({
	rows,
	lines,
	at = 0,
}: {
	rows: number;
	lines?: number;
	at?: number;
}) {
	return (
		<div inert className={cn(PROSE, COLUMN)}>
			<div className={cn(PROSE_BLOCKS, STACK)}>
				{Array.from({ length: rows }, (_, row) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
					<p key={row} className={text({ role: "body" })}>
						{lines === undefined ? (
							<Painted role="paragraph" at={at + row} />
						) : (
							Array.from({ length: lines }, (_, line) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
								<span key={line} className={PAINTED_LINE}>
									<Painted role="sentence" at={at + row * lines + line} />
								</span>
							))
						)}
					</p>
				))}
			</div>
		</div>
	);
}
