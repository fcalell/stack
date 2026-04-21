import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type TextProps = {
	class?: string;
};

function H1<T extends ValidComponent = "h1">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h1"
			class={cn("text-4xl leading-[1.1] font-bold tracking-tight", local.class)}
			{...rest}
		/>
	);
}

function H2<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h2"
			class={cn(
				"text-3xl leading-[1.15] font-semibold tracking-tight",
				local.class,
			)}
			{...rest}
		/>
	);
}

function H3<T extends ValidComponent = "h3">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h3"
			class={cn(
				"text-2xl leading-[1.2] font-semibold tracking-tight",
				local.class,
			)}
			{...rest}
		/>
	);
}

function H4<T extends ValidComponent = "h4">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="h4"
			class={cn(
				"text-xl leading-[1.25] font-semibold tracking-tight",
				local.class,
			)}
			{...rest}
		/>
	);
}

function P<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="p"
			class={cn("text-base leading-relaxed", local.class)}
			{...rest}
		/>
	);
}

function Lead<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="p"
			class={cn("text-xl leading-relaxed text-muted-foreground", local.class)}
			{...rest}
		/>
	);
}

function Large<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="p"
			class={cn("text-lg leading-snug font-semibold", local.class)}
			{...rest}
		/>
	);
}

function Small<T extends ValidComponent = "small">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="small"
			class={cn("text-sm leading-normal", local.class)}
			{...rest}
		/>
	);
}

function Muted<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="p"
			class={cn("text-sm leading-normal text-muted-foreground", local.class)}
			{...rest}
		/>
	);
}

function Code<T extends ValidComponent = "code">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	return (
		<Polymorphic
			as="code"
			class={cn(
				"bg-muted relative rounded-sm px-[0.4em] py-[0.2em] font-mono text-[0.9em]",
				local.class,
			)}
			{...rest}
		/>
	);
}

export const Text = { H1, H2, H3, H4, P, Lead, Large, Small, Muted, Code };
