import type { LucideIcon } from "lucide-solid";
import { createContext, type JSX, useContext } from "solid-js";

// The consumer's closed icon set: a name to a glyph. `Icon`, a row's marks and
// a place's icon look names up here, so an unknown name fails loudly instead
// of drawing nothing.
export type IconSet = Record<string, LucideIcon>;

const IconsContext = createContext<IconSet>({});

export function IconsProvider(props: {
	icons: IconSet;
	children: JSX.Element;
}) {
	return (
		<IconsContext.Provider value={props.icons}>
			{props.children}
		</IconsContext.Provider>
	);
}

export function useIcon(name: string): LucideIcon {
	const glyph = useContext(IconsContext)[name];
	if (!glyph) {
		throw new Error(
			`[plugin-solid-ui] no icon named "${name}" in the IconsProvider set`,
		);
	}
	return glyph;
}
