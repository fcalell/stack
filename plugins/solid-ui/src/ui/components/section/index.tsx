import { rhythm } from "@fcalell/ui-core/variants";
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

function Root(
	props: ComponentProps<"section"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	const [local, rest] = splitProps(props, ["children"]);
	const titleId = createUniqueId();
	return (
		<SectionContext.Provider value={{ titleId }}>
			<section
				aria-labelledby={titleId}
				// The region rung: a Section's children are a screen's regions, so
				// the column gaps at rhythm({ unit: "section" }). min-h-0 keeps a
				// Section between Frame and a scroll pane shrinkable, or the pane
				// grows past the clipped frame and never scrolls.
				class={cn(rhythm({ unit: "section" }), "flex min-h-0 flex-1 flex-col")}
				{...rest}
			>
				{local.children}
			</section>
		</SectionContext.Provider>
	);
}

function Header(
	props: ComponentProps<"header"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<header
			class="flex min-h-12 items-center justify-between border-b-2 border-edge px-6 py-3"
			{...props}
		/>
	);
}

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<
		T,
		{ class?: never; style?: never; classList?: never }
	>,
) {
	const ctx = useContext(SectionContext);
	return (
		<Polymorphic
			as="h2"
			id={ctx?.titleId}
			class="text-h2 font-bold uppercase tracking-widest"
			{...props}
		/>
	);
}

function Content(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	// pb only: the section gap above already carries the head-to-content 24.
	return <div class="w-full px-6 pb-6" {...props} />;
}

function Table(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="w-full" {...props} />;
}

export const Section = Object.assign(Root, {
	Header,
	Title,
	Content,
	Table,
});
