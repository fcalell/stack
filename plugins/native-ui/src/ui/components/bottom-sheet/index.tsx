import {
	BottomSheetModal,
	type BottomSheetModalProps,
	BottomSheetView,
} from "@gorhom/bottom-sheet";
import { type ComponentRef, forwardRef, type ReactNode } from "react";
import { View } from "react-native";

// gorhom's modal paints its own background/handle via style objects (no
// className). We make it transparent and draw a themed surface + grabber inside
// with uniwind classes, so the sheet honours the active theme like every other
// primitive. Wrapped in BottomSheetModalProvider by plugin-native-ui's wiring.
const TRANSPARENT = { backgroundColor: "transparent" } as const;

export interface BottomSheetProps extends Partial<BottomSheetModalProps> {
	children?: ReactNode;
}

export const BottomSheet = forwardRef<
	ComponentRef<typeof BottomSheetModal>,
	BottomSheetProps
>(({ children, ...rest }, ref) => (
	<BottomSheetModal
		ref={ref}
		backgroundStyle={TRANSPARENT}
		handleComponent={null}
		{...rest}
	>
		<BottomSheetView>
			<View className="rounded-t-2xl bg-canvas px-4 pb-8 pt-3">
				<View className="mb-3 h-1 w-10 self-center rounded-full bg-edge" />
				{children}
			</View>
		</BottomSheetView>
	</BottomSheetModal>
));
BottomSheet.displayName = "BottomSheet";

export { useBottomSheetModal } from "@gorhom/bottom-sheet";
