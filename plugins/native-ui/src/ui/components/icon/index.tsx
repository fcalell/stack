import type { IconName } from "@fcalell/ui-core/descriptors";
import { type IconFit, icon } from "@fcalell/ui-core/variants";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { GLYPHS, Glyph } from "../../lib/glyph";
import { useInk } from "../../lib/ink";

export interface IconProps extends Closed {
	name: IconName;
	fit?: IconFit;
}

// A Lucide glyph in the ink of its place, at the size of what it sits
// beside. A lucide glyph takes a number and a colour, so the cell's size is
// resolved and the place's ink is read off `Ink`.
export function Icon({ name, fit }: IconProps) {
	const { width } = useResolveClassNames(icon({ fit }));
	return (
		<Glyph
			icon={GLYPHS[name]}
			tone={useInk()}
			size={typeof width === "number" ? width : undefined}
		/>
	);
}
