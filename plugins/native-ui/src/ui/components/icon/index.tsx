import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconStroke } from "@fcalell/ui-core/tokens";
import { type IconFit, icon } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GLYPHS, Glyph } from "../../lib/glyph";
import { useInk } from "../../lib/ink";
import { inertProps, paintBox, useShown } from "../../lib/paint";

export interface IconProps extends Closed {
	name: IconName;
	fit?: IconFit;
}

// What every icon draws: the public `Icon` at the line weight, or a mark that
// carries meaning (a change mark) at the mark weight. A lucide glyph takes a
// number and a colour, so the cell's size is resolved and the place's ink is
// read off `Ink`. `painted` is the glyph's box while its data is not here,
// nothing drawn in it. Outside the package's exports.
export function IconBase({
	name,
	fit,
	stroke,
	painted,
}: IconProps & { stroke: IconStroke; painted?: boolean }) {
	const { width } = useResolveClassNames(icon({ fit }));
	const shown = useShown(painted);
	const tone = useInk();
	if (painted)
		return (
			<View
				{...inertProps(true)}
				className={cn(icon({ fit }), paintBox(shown))}
			/>
		);
	return (
		<Glyph
			icon={GLYPHS[name]}
			tone={tone}
			size={typeof width === "number" ? width : undefined}
			stroke={stroke}
		/>
	);
}

// A Lucide glyph in the ink of its place, at the size of what it sits beside.
export function Icon({ name, fit }: IconProps) {
	return <IconBase name={name} fit={fit} stroke="line" />;
}
