import type { RowMark } from "@fcalell/ui-core/descriptors";
import {
	BADGE_RING,
	BADGE_RING_CENTRE,
	ROW_FLAG,
} from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { Ink } from "../../lib/ink";
import { IconBase } from "../icon";

const END_MARK = "flex-row items-center shrink-0";

// A boolean mark whose words are not drawn (`words: false`): its glyph alone
// (the required ring outlined with its centre filled, as in a badge, or the
// flag's glyph in the meta ink), a row's end group's first item and the end of
// a record head's name line, named for assistive tech by its label. It is no
// badge: a badge is a fact with its words. It takes no press: a press reaches
// the row. Outside the package's exports.
export function EndMark({ mark }: { mark: RowMark }) {
	const glyph =
		"ring" in mark ? (
			<View className={BADGE_RING}>
				<View className={BADGE_RING_CENTRE} />
			</View>
		) : (
			<View className={ROW_FLAG}>
				<Ink.Provider value="ink-meta">
					<IconBase name={mark.flag} fit="meta" stroke="line" />
				</Ink.Provider>
			</View>
		);
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={mark.label}
			pointerEvents="none"
			className={END_MARK}
		>
			{glyph}
		</View>
	);
}
