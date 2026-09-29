import type { Words } from "@fcalell/ui-core/tokens";
import { ENGLISH } from "@fcalell/ui-core/tokens";
import { createContext, type ReactNode, use } from "react";

// Every word a molecule draws on its own. The generated providers mount the
// context with the consumer's `words` option; without it the components
// speak English.
const WordsContext = createContext<Words>(ENGLISH);

export function WordsProvider(props: { words: Words; children: ReactNode }) {
	return <WordsContext value={props.words}>{props.children}</WordsContext>;
}

export function useWords(): Words {
	return use(WordsContext);
}
