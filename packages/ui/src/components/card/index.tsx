import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type TextProps = {
	class?: string;
};

function Root(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn("rounded-lg border bg-card text-card-foreground", local.class)}
			{...rest}
		/>
	);
}

function Header(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("flex flex-col gap-1.5 p-6", local.class)} {...rest} />;
}

function Title<T extends ValidComponent = "h3">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h3"
			class={cn(
				"text-lg font-semibold leading-none tracking-tight",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Description(props: ComponentProps<"p">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<p class={cn("text-sm text-muted-foreground", local.class)} {...rest} />
	);
}

function Content(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("p-6 pt-0", local.class)} {...rest} />;
}

function Footer(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div class={cn("flex items-center p-6 pt-0", local.class)} {...rest} />
	);
}

export const Card = Object.assign(Root, {
	Header,
	Title,
	Description,
	Content,
	Footer,
});
