import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

// The keyboard-aware scroll pane every Place and Screen scrolls in, wrapped
// so it takes `className` and `contentContainerClassName` like a core host.
// The bar in flow at a Form's end is what the keyboard must never cover.
export const Scroll = withUniwind(KeyboardAwareScrollView);
