import { PROSE, PROSE_BLOCKS, text } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";

// The loaded column's box (Prose's own).
const COLUMN = "min-w-0";

/** A markdown text that is not here, in the column's box, inert: `rows` paragraphs of filler, or, given `lines`, `rows` paragraphs of that many one-line clipped bars (a Prose paints one paragraph of `PAINT_ROWS` lines: its length is the data's and unknown, so a bar that wraps would stand taller than the text that lands). Outside the package's exports: a Message's reply paints one paragraph of filler. */
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
		<View {...inertProps(true)} className={cn(PROSE, COLUMN)}>
			<View className={PROSE_BLOCKS}>
				{Array.from({ length: rows }, (_, row) =>
					lines === undefined ? (
						<PaintText
							painted
							// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
							key={row}
							className={text({ role: "body" })}
						>
							<Painted role="paragraph" at={at + row} />
						</PaintText>
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
						<View key={row}>
							{Array.from({ length: lines }, (_, line) => (
								<PaintText
									painted
									// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
									key={line}
									numberOfLines={1}
									{...clipWhen(true)}
									className={text({ role: "body" })}
								>
									<Painted role="sentence" at={at + row * lines + line} />
								</PaintText>
							))}
						</View>
					),
				)}
			</View>
		</View>
	);
}
