import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import {
	text,
	type TextTone,
	type TextVariant,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type TextProps = {
	variant?: TextVariant;
	tone?: TextTone;
	strong?: boolean;
	mono?: boolean;
	class?: string;
};

function Text<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, [
		"variant",
		"tone",
		"strong",
		"mono",
		"class",
	]);
	const variant = () => local.variant ?? "body";
	return (
		<Polymorphic
			as="p"
			class={cn(
				text({ variant: variant(), tone: local.tone }),
				local.strong && textStrong({ variant: variant() }),
				// Font family is a platform overlay, so it never enters the matrix.
				local.mono && "font-mono",
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { TextProps };
export { Text };
