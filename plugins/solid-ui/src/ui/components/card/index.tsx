import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import {
	card,
	type CardPadding,
	type CardRing,
	text,
} from "@fcalell/ui-core/variants";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type TextProps = {
	class?: string;
};

type RootProps = ComponentProps<"div"> & {
	padding?: CardPadding;
	ring?: CardRing;
};

// The inset sits on the root, so every section below is pure rhythm.
function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["class", "padding", "ring"]);
	return (
		<div
			class={cn(
				card({ padding: local.padding, ring: local.ring }),
				"flex flex-col gap-stack",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Header(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div class={cn("flex flex-col gap-pair", local.class)} {...rest} />
	);
}

function Title<T extends ValidComponent = "h3">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h3"
			class={cn(text({ variant: "h3" }), local.class)}
			{...rest}
		/>
	);
}

function Description(props: ComponentProps<"p">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<p
			class={cn(text({ variant: "caption", tone: "ink-3" }), local.class)}
			{...rest}
		/>
	);
}

function Content(props: ComponentProps<"div">) {
	return <div {...props} />;
}

function Footer(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("flex items-center", local.class)} {...rest} />;
}

export const Card = Object.assign(Root, {
	Header,
	Title,
	Description,
	Content,
	Footer,
});
