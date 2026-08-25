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

// The closure is a denylist against gorhom's type: the style objects, and the
// render-takeover slots that would replace the sheet's own design. A gorhom
// upgrade adding a new styling prop reopens silently; the fixture pins
// today's list. Behavioral props keep flowing.
type GorhomStyling =
	| "style"
	| "backgroundStyle"
	| "handleStyle"
	| "handleIndicatorStyle"
	| "containerStyle"
	| "backgroundComponent"
	| "handleComponent"
	| "backdropComponent"
	| "footerComponent"
	| "containerComponent";

export interface BottomSheetProps
	extends Omit<Partial<BottomSheetModalProps>, GorhomStyling> {
	children?: ReactNode;
	className?: never;
	style?: never;
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
			<View className="rounded-t-sheet bg-canvas px-4 pb-8 pt-3">
				<View className="mb-3 h-1 w-10 self-center rounded-full bg-edge" />
				{children}
			</View>
		</BottomSheetView>
	</BottomSheetModal>
));
BottomSheet.displayName = "BottomSheet";

export { useBottomSheetModal } from "@gorhom/bottom-sheet";
