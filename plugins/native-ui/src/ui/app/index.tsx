import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

const FLEX_FILL = { flex: 1 } as const;

// The UI-shell providers, composed for use OUTSIDE the generated entry (tests,
// Storybook, a screenshot harness). The real app entry composes the same stack
// — plus Auth + Query — through plugin-expo's `providers` slot; this is the
// manual equivalent of just the design-system layer. uniwind theming needs no
// provider (it is CSS-first), so there is intentionally no ThemeProvider here.
export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<GestureHandlerRootView style={FLEX_FILL}>
			<KeyboardProvider>
				<SafeAreaProvider>
					<BottomSheetModalProvider>{children}</BottomSheetModalProvider>
				</SafeAreaProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
