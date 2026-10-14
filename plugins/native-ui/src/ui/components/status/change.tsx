import type { ChangeKind } from "@fcalell/ui-core/descriptors";
import { CHANGE_GLYPH } from "@fcalell/ui-core/list-state";
import { changeContentTone, changeMark } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { IconBase } from "../icon";

const BOX = "shrink-0 items-center justify-center";

// Where a row, a fact or a field stands in a change set: its kind's glyph in
// the kind's ink in a lane one icon wide, named by the kind's word. `painted`
// is the lane with the glyph's box filled, for a kind that is not here.
// Outside the package's exports.
export function ChangeMark({
	kind,
	painted,
}: {
	kind: ChangeKind;
	painted?: boolean;
}) {
	const words = useWords();
	if (painted)
		return (
			<View className={BOX}>
				<IconBase name="Plus" fit="meta" stroke="mark" painted />
			</View>
		);
	return (
		<View
			accessible
			accessibilityLabel={words[kind]}
			className={cn(changeMark({ kind }), BOX)}
		>
			<Ink.Provider value={changeContentTone(kind)}>
				<IconBase name={CHANGE_GLYPH[kind]} fit="meta" stroke="mark" />
			</Ink.Provider>
		</View>
	);
}
