import { ENGLISH, type Words } from "@fcalell/ui-core/tokens";
import { createContext, type ReactNode, useContext } from "react";

// Every word a molecule draws on its own. The generated entry wraps the app in
// this provider with the consumer's `words` option; without one, English.
const WordsContext = createContext<Words>(ENGLISH);

export function WordsProvider({
	words,
	children,
}: {
	words: Words;
	children: ReactNode;
}) {
	return (
		<WordsContext.Provider value={words}>{children}</WordsContext.Provider>
	);
}

export function useWords(): Words {
	return useContext(WordsContext);
}

export type { Words };
