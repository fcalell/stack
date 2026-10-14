import { cn } from "@fcalell/ui-core/cn";
import { PROSE, PROSE_BLOCKS, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";

// The loaded column's boxes (Prose's own).
const COLUMN = "flex flex-col min-w-0";
const STACK = "flex flex-col";

/** A markdown text that is not here: `rows` paragraphs of filler in the column's box, inert. Outside the package's exports: a Prose paints `PAINT_ROWS` of them, a Message's reply one. */
export function PaintedProse({ rows, at = 0 }: { rows: number; at?: number }) {
	return (
		<div inert className={cn(PROSE, COLUMN)}>
			<div className={cn(PROSE_BLOCKS, STACK)}>
				{Array.from({ length: rows }, (_, row) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
					<p key={row} className={text({ role: "body" })}>
						<Painted role="paragraph" at={at + row} />
					</p>
				))}
			</div>
		</div>
	);
}
