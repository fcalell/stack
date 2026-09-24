import { Dynamic } from "solid-js/web";
import type { Closed } from "#lib/closed";
import { useIcon } from "#lib/icons";

// A glyph from the consumer's closed icon set, sized by the type role around
// it, so it has no size of its own.
export type IconProps = Closed & { name: string };

export function Icon(props: IconProps) {
	return (
		<Dynamic
			component={useIcon(props.name)}
			class="size-[1.25em] shrink-0"
			aria-hidden="true"
		/>
	);
}
