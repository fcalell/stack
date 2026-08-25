import {
	type CardPadding,
	type CardRing,
	card,
	text,
} from "@fcalell/ui-core/variants";
import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type RootProps = ComponentProps<"div"> & {
	padding?: CardPadding;
	ring?: CardRing;
	class?: never;
	style?: never;
	classList?: never;
};

// The inset sits on the root, so every section below is pure rhythm.
function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["padding", "ring"]);
	return (
		<div
			class={cn(
				card({ padding: local.padding, ring: local.ring }),
				"flex flex-col gap-stack",
			)}
			{...rest}
		/>
	);
}

function Header(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex flex-col gap-pair" {...props} />;
}

function Title<T extends ValidComponent = "h3">(
	props: PolymorphicProps<
		T,
		{ class?: never; style?: never; classList?: never }
	>,
) {
	return <Polymorphic as="h3" class={text({ variant: "h3" })} {...props} />;
}

function Description(
	props: ComponentProps<"p"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <p class={text({ variant: "caption", tone: "ink-3" })} {...props} />;
}

function Content(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div {...props} />;
}

function Footer(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex items-center" {...props} />;
}

export const Card = Object.assign(Root, {
	Header,
	Title,
	Description,
	Content,
	Footer,
});
