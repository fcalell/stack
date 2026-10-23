// The safe-area read surface, re-exported so screens and compositions don't
// reach around the plugin to import react-native-safe-area-context directly. The
// SafeAreaProvider is already wired by this plugin's providers slot, so consumers
// only need to READ insets — use `useSafeAreaInsets` for padding and `SafeAreaView`
// for a self-insetting container.

export type {
	Edge,
	EdgeInsets,
	Rect,
} from "react-native-safe-area-context";
export {
	SafeAreaView,
	useSafeAreaFrame,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
