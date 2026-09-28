import type { SpinnerKind } from "@fcalell/ui-core/tokens";
import { BusyGlyph } from "../../lib/busy";
import type { Closed } from "../../lib/closed";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";

export interface SpinnerProps extends Closed {
	kind?: SpinnerKind;
}

// The busy glyph in the meta ink: `circle` spins, `scramble` cycles mono
// glyphs.
export function Spinner({ kind }: SpinnerProps) {
	const words = useWords();
	return (
		<BusyGlyph
			kind={kind}
			color={useTokenColor("--color-ink-meta")}
			label={words.loading}
		/>
	);
}
