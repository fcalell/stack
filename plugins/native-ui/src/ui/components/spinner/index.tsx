import { BusyGlyph } from "../../lib/busy";
import type { Closed } from "../../lib/closed";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";

export interface SpinnerProps extends Closed {}

// The busy ring in the meta ink.
export function Spinner(_props: SpinnerProps) {
	const words = useWords();
	return (
		<BusyGlyph
			color={useTokenColor("--color-ink-meta")}
			label={words.loading}
		/>
	);
}
