import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type IconSet, IconsProvider } from "../lib/icons";
import { type Words, WordsProvider } from "../lib/words";

const FLEX_FILL = { flex: 1 } as const;

// The UI-shell providers, composed for use outside the generated entry
// (tests, a screenshot harness). The real app entry composes the same stack,
// plus Auth and Query, through plugin-expo's `providers` slot. uniwind theming
// needs no provider (it is CSS-first), so there is no ThemeProvider here.
export function AppProviders({
	children,
	words,
	icons,
}: {
	children: ReactNode;
	words?: Words;
	icons?: IconSet;
}) {
	const themed = (
		<GestureHandlerRootView style={FLEX_FILL}>
			<KeyboardProvider>
				<SafeAreaProvider>
					<BottomSheetModalProvider>
						<IconsProvider icons={icons ?? {}}>{children}</IconsProvider>
					</BottomSheetModalProvider>
				</SafeAreaProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
	return words ? <WordsProvider words={words}>{themed}</WordsProvider> : themed;
}
