import {
	KeyboardAvoidingView,
	KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

// The keyboard-aware scroll pane every Place and Screen scrolls in, wrapped
// so it takes `className` and `contentContainerClassName` like a core host.
// The bar in flow at a Form's end is what the keyboard must never cover.
export const Scroll = withUniwind(KeyboardAwareScrollView);

// The column a docked foot shares with what scrolls over it (a filling
// Thread's log, a Place's body), lifted over the keyboard.
export const Lifted = withUniwind(KeyboardAvoidingView);
