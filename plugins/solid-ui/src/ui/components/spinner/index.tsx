import type { ContentTone } from "@fcalell/ui-core/variants";
import { LoaderCircle } from "lucide-solid";

// The spinning glyph for a busy control; the text-scramble Loader is the
// loading treatment for a pane. A tone cell would be platform-conditional
// (native colors a prop, not a class), so the tone rides the token variable
// directly, the web mirror of native's useTokenColor, and no class is
// assembled from it.
type SpinnerProps = {
	tone?: ContentTone;
	class?: never;
	style?: never;
	classList?: never;
};

function Spinner(props: SpinnerProps) {
	return (
		<LoaderCircle
			class="size-4 animate-spin"
			role="status"
			style={{ color: `var(--color-${props.tone ?? "ink-1"})` }}
		/>
	);
}

export type { SpinnerProps };
export { Spinner };
