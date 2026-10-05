import { LOCK_GLYPH } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

const LOCK = "flex-row items-center";

// A lock glyph, read aloud as the word Locked, then `reason` when it has
// one. Outside the package's exports.
export function LockMark({ reason }: { reason?: string }) {
	const words = useWords();
	return (
		<View
			accessible
			accessibilityLabel={
				reason === undefined ? words.locked : `${words.locked}, ${reason}`
			}
			className={cn(LOCK_GLYPH, LOCK)}
		>
			<Ink.Provider value="ink-meta">
				<Icon name="Lock" fit="meta" />
			</Ink.Provider>
		</View>
	);
}
