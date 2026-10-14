import { LOCK_GLYPH } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { IconBase } from "../icon";

const LOCK = "flex-row items-center";

// A lock glyph, named Locked; `painted` is its box while the row's lock is not
// here. Outside the package's exports.
export function LockMark(props: { painted?: boolean }) {
	const words = useWords();
	return (
		<View
			accessible
			accessibilityLabel={words.locked}
			className={cn(LOCK_GLYPH, LOCK)}
		>
			<Ink.Provider value="ink-meta">
				<IconBase
					name="Lock"
					fit="meta"
					stroke="line"
					painted={props.painted}
				/>
			</Ink.Provider>
		</View>
	);
}
