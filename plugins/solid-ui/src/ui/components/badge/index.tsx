import {
	type BadgeTone,
	badge,
	badgeLabel,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// Neither badge table carries a type role, so `micro` is composed alongside
// them: 12px semibold, the size the pill has always been.
const ROLE = { variant: "micro" } as const;

const SHELL =
	"inline-flex items-center transition-[color,background-color] duration-base ease-ui";

type BadgeProps = {
	tone?: BadgeTone;
	class?: string;
};

function Badge<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, BadgeProps>,
) {
	const [local, rest] = splitProps(props as BadgeProps, ["class", "tone"]);
	return (
		<Polymorphic
			as="div"
			class={cn(
				badge({ tone: local.tone }),
				badgeLabel({ tone: local.tone }),
				text(ROLE),
				textStrong(ROLE),
				SHELL,
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { BadgeProps };
export { Badge };
