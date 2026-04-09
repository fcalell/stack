import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import {
	createContext,
	createUniqueId,
	splitProps,
	useContext,
} from "solid-js";
import { cn } from "#lib/cn";

const SectionContext = createContext<{ titleId: string }>();

type TextProps = {
	class?: string;
};

function Root(props: ComponentProps<"section">) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	const titleId = createUniqueId();
	return (
		<SectionContext.Provider value={{ titleId }}>
			<section
				aria-labelledby={titleId}
				class={cn("flex flex-1 flex-col", local.class)}
				{...rest}
			>
				{local.children}
			</section>
		</SectionContext.Provider>
	);
}

function Header(props: ComponentProps<"header">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<header
			class={cn(
				"flex min-h-12 items-center justify-between border-b-2 border-border px-6 py-3",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TextProps>,
) {
	const [local, rest] = splitProps(props as TextProps, ["class"]);
	const ctx = useContext(SectionContext);
	return (
		<Polymorphic
			as="h2"
			id={ctx?.titleId}
			class={cn("text-2xl font-bold uppercase tracking-widest", local.class)}
			{...rest}
		/>
	);
}

function Content(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("w-full px-6 py-6", local.class)} {...rest} />;
}

function Table(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("w-full", local.class)} {...rest} />;
}

export const Section = Object.assign(Root, {
	Header,
	Title,
	Content,
	Table,
});
