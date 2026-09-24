import type { LucideIcon } from "lucide-react-native";
import { createContext, type ReactNode, useContext } from "react";

// The consumer's closed icon set, by name. `Icon`, a row's `leading`, a mark
// and a place all name an icon from it; an unknown name throws at render.
export type IconSet = Record<string, LucideIcon>;

const IconsContext = createContext<IconSet>({});

export function IconsProvider({
	icons,
	children,
}: {
	icons: IconSet;
	children: ReactNode;
}) {
	return (
		<IconsContext.Provider value={icons}>{children}</IconsContext.Provider>
	);
}

export function useIcon(name: string): LucideIcon {
	const icon = useContext(IconsContext)[name];
	if (!icon) {
		throw new Error(
			`[plugin-native-ui] no icon named "${name}" in the app's icon set`,
		);
	}
	return icon;
}
