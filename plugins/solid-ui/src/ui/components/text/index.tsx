import {
	type TextTone,
	type TextVariant,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type TextProps = {
	variant?: TextVariant;
	tone?: TextTone;
	strong?: boolean;
	mono?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

function Text<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, [
		"variant",
		"tone",
		"strong",
		"mono",
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
			)}
			{...rest}
		/>
	);
}

export type { TextProps };
export { Text };
