import type { ComponentProps } from "react";
import {
	KeyboardAvoidingView,
	KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

const AwareScroll = withUniwind(KeyboardAwareScrollView);

// The keyboard-aware scroll pane every Place and Screen scrolls in, wrapped
// so it takes `className` and `contentContainerClassName` like a core host.
// The bar in flow at a Form's end is what the keyboard must never cover. A
// tap on an act in it reaches the act and leaves the keyboard up (a docked
// MessageInput's Send keeps typing); a tap on nothing still dismisses it.
export function Scroll(props: ComponentProps<typeof AwareScroll>) {
	return <AwareScroll keyboardShouldPersistTaps="handled" {...props} />;
}

// The column a docked foot shares with what scrolls over it (a filling
// Thread's log, a Place's body), lifted over the keyboard.
export const Lifted = withUniwind(KeyboardAvoidingView);
