import type { IconFit } from "@fcalell/ui-core/variants";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { Glyph } from "../../lib/glyph";
import { useIcon } from "../../lib/icons";

export interface IconProps extends Closed {
	name: string;
	fit: IconFit;
}

// Whole class strings, so uniwind's scan sees each size it resolves.
const FIT_SIZE: Record<IconFit, string> = {
	meta: "size-icon-meta",
	body: "size-icon",
	control: "size-icon-control",
};

// An icon from the consumer's closed set, in ink, at the size of what it
// sits beside. A lucide glyph takes a number, so the size class is resolved.
export function Icon({ name, fit }: IconProps) {
	const { width } = useResolveClassNames(FIT_SIZE[fit]);
	return (
		<Glyph
			icon={useIcon(name)}
			size={typeof width === "number" ? width : undefined}
		/>
	);
}
