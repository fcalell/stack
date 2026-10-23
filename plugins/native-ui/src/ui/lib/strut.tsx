import { lineBox } from "@fcalell/ui-core/variants";
import { Text as RNText } from "react-native";

// The zero-width space the strut draws: a line with no glyph in it.
const ZERO_WIDTH = "​";

export type StrutRole = NonNullable<
	NonNullable<Parameters<typeof lineBox>[0]>["role"]
>;

// A zero-width line of a type role: set beside a bar, a glyph or an act, it
// gives the line the height of the text it stands in for or beside, so what
// shares the line centres where the text's glyphs would. The web's `h-lh`.
export function Strut({ role }: { role: StrutRole }) {
	return <RNText className={lineBox({ role })}>{ZERO_WIDTH}</RNText>;
}
