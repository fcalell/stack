import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TabsPrimitive from "@kobalte/core/tabs";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── List ───

type ListProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsListProps<T> & { class?: string };

function List<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ListProps<T>>,
) {
	const [local, rest] = splitProps(props as ListProps, ["class"]);
	return (
		<TabsPrimitive.List
			class={cn(
				"inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Trigger ───

type TriggerProps<T extends ValidComponent = "button"> =
	TabsPrimitive.TabsTriggerProps<T> & { class?: string };

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	const [local, rest] = splitProps(props as TriggerProps, ["class"]);
	return (
		<TabsPrimitive.Trigger
			class={cn(
				"inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-base ease-ui focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:bg-background data-selected:text-foreground",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsContentProps<T> & { class?: string };

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, ["class"]);
	return (
		<TabsPrimitive.Content
			class={cn(
				"mt-0 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Indicator ───

type IndicatorProps<T extends ValidComponent = "div"> =
	TabsPrimitive.TabsIndicatorProps<T> & { class?: string };

function Indicator<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, IndicatorProps<T>>,
) {
	const [local, rest] = splitProps(props as IndicatorProps, ["class"]);
	return (
		<TabsPrimitive.Indicator
			class={cn(
				"absolute bg-primary transition-all duration-250 data-[orientation=horizontal]:-bottom-px data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:-right-px data-[orientation=vertical]:w-0.5",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Exports ───

export const Tabs = Object.assign(TabsPrimitive.Root, {
	List,
	Trigger,
	Content,
	Indicator,
});
