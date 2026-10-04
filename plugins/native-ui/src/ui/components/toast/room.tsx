import type { ReactNode } from "react";
import { View } from "react-native";
import { useToastBox } from "../../lib/frame";

const ROOM = "absolute inset-0";
const BOX = "flex-1";

// The box the Shell's toasts stand in, drawn by the region that stands over
// the page's docked foot (a Place's body, a filling Thread's log), so the
// toasts stand above the foot, and the tab bar under it, by layout; above
// `children` too, the room of an act floating over the region.
export function ToastRoom({ children }: { children?: ReactNode }) {
	const box = useToastBox();
	return (
		<View pointerEvents="none" className={ROOM}>
			<View ref={box.ref} onLayout={box.onLayout} className={BOX} />
			{children}
		</View>
	);
}
