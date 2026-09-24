import type { Words } from "@fcalell/ui-core/tokens";
import { ENGLISH } from "@fcalell/ui-core/tokens";
import { createContext, type JSX, useContext } from "solid-js";

// Every word a molecule draws on its own. The generated entry mounts the
// provider with the consumer's `words` option; without it the components
// speak English.
const WordsContext = createContext<Words>(ENGLISH);

export function WordsProvider(props: { words: Words; children: JSX.Element }) {
	return (
		<WordsContext.Provider value={props.words}>
			{props.children}
		</WordsContext.Provider>
	);
}

export function useWords(): Words {
	return useContext(WordsContext);
}
