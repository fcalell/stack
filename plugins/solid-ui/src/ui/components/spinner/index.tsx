import { LoaderCircle } from "lucide-solid";
import type { Closed } from "#lib/closed";
import { useWords } from "#lib/words";

// The spinning glyph for a busy control, in the ink around it.
export type SpinnerProps = Closed;

export function Spinner(_props: SpinnerProps) {
	const words = useWords();
	return (
		<LoaderCircle
			class="size-[1.25em] shrink-0 animate-spin"
			role="status"
			aria-label={words.loading}
		/>
	);
}
