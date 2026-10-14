import { PROSE, PROSE_BLOCKS, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { inertProps, Painted } from "../../lib/paint";

// The loaded column's box (Prose's own).
const COLUMN = "min-w-0";

/** A markdown text that is not here: `rows` paragraphs of filler in the column's box, inert. Outside the package's exports: a Prose paints `PAINT_ROWS` of them, a Message's reply one. */
export function PaintedProse({ rows, at = 0 }: { rows: number; at?: number }) {
	return (
		<View {...inertProps(true)} className={cn(PROSE, COLUMN)}>
			<View className={PROSE_BLOCKS}>
				{Array.from({ length: rows }, (_, row) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs are fixed stand-ins
					<RNText key={row} className={text({ role: "body" })}>
						<Painted role="paragraph" at={at + row} />
					</RNText>
				))}
			</View>
		</View>
	);
}
