import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { CHEVRON, type IconFit } from "@fcalell/ui-core/variants";
import { Icon } from "../components/icon/index.tsx";

// A quarter turn takes a chevron down to right (a fold closing); a half turn
// takes an arrow or a chevron over to its opposite.
const BY = { quarter: "-rotate-90", half: "rotate-180" } as const;

/** A glyph that turns instead of being swapped for its opposite: a disclosure chevron, a sort arrow. It stands as `name` and, `turned`, a quarter or a half turn from it, on `CHEVRON`'s rung. */
export function Turn(props: {
	name: IconName;
	fit?: IconFit;
	turned: boolean;
	by: keyof typeof BY;
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0",
				CHEVRON,
				props.turned && BY[props.by],
			)}
		>
			<Icon name={props.name} fit={props.fit} />
		</span>
	);
}
