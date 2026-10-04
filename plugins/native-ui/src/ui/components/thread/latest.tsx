import { THREAD_LATEST } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { View } from "react-native";
import { ToLatest } from "../../lib/frame";
import { useWords } from "../../lib/words";
import { Button } from "../button";

// The layer covers the region over the docked foot, so the act centres on it
// and the log under it keeps the touch everywhere else.
const LAYER = "absolute inset-0 items-center justify-end";

// The act back to the newest message, centred at the foot of the region it
// stands in while `ToLatest` holds the way back.
export function Latest() {
	const back = useContext(ToLatest);
	const words = useWords();
	if (!back) return null;
	return (
		<View pointerEvents="box-none" className={LAYER}>
			<View className={THREAD_LATEST}>
				<Button
					act="secondary"
					icon="ArrowDown"
					label={words.latest}
					onAct={back}
				/>
			</View>
		</View>
	);
}
