import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { createUniqueId, mergeProps, splitProps } from "solid-js";
import { Separator } from "#components/separator";
import { cn } from "#lib/cn";

// ─── Group ───

function Group(props: ComponentProps<"ul">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<ul
			class={cn(
				"flex w-full list-none flex-col gap-4 has-data-[size=sm]:gap-2 has-data-[size=xs]:gap-2",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── ItemSeparator ───

function ItemSeparator(props: ComponentProps<"hr">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<Separator
			orientation="horizontal"
			class={cn("my-2", local.class)}
			{...rest}
		/>
	);
}

// ─── Root ───

const itemClasses = cva(
	"group/item flex w-full flex-wrap items-center rounded-md text-xs outline-none transition-colors duration-100 hover:bg-muted focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
	{
		variants: {
			variant: {
				default: "border border-transparent",
				outline: "border-2 border-border",
				muted: "border border-transparent bg-muted",
			},
			size: {
				default: "gap-2 px-3 py-2",
				sm: "gap-2 px-3 py-2",
				xs: "min-h-11 gap-2 px-2 py-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ItemProps = ComponentProps<"li"> & VariantProps<typeof itemClasses>;

function Root(props: ItemProps) {
	const merged = mergeProps(
		{ variant: "default" as const, size: "default" as const },
		props,
	);
	const [local, rest] = splitProps(merged, ["class", "variant", "size"]);
	return (
		<li
			data-slot="item"
			data-variant={local.variant}
			data-size={local.size}
			class={itemClasses({
				variant: local.variant,
				size: local.size,
				className: local.class,
			})}
			{...rest}
		/>
	);
}

// ─── Media ───

const itemMediaClasses = cva(
	"flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "[&_svg:not([class*='size-'])]:size-4",
				image:
					"size-10 overflow-hidden rounded-none group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type MediaProps = ComponentProps<"div"> & VariantProps<typeof itemMediaClasses>;

function Media(props: MediaProps) {
	const merged = mergeProps({ variant: "default" as const }, props);
	const [local, rest] = splitProps(merged, ["class", "variant"]);
	return (
		<div
			data-slot="item-media"
			data-variant={local.variant}
			class={itemMediaClasses({
				variant: local.variant,
				className: local.class,
			})}
			{...rest}
		/>
	);
}

// ─── Content ───

function ItemContent(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot="item-content"
			class={cn(
				"flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Title ───

function Title(props: ComponentProps<"span">) {
	const titleId = createUniqueId();
	const [local, rest] = splitProps(props, ["class", "id"]);
	return (
		<span
			data-slot="item-title"
			id={local.id ?? titleId}
			class={cn(
				"flex w-fit flex-row items-center gap-2 text-xs font-medium underline-offset-4 line-clamp-1",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Description ───

function Description(props: ComponentProps<"p">) {
	const descId = createUniqueId();
	const [local, rest] = splitProps(props, ["class", "id"]);
	return (
		<p
			data-slot="item-description"
			id={local.id ?? descId}
			class={cn(
				"text-left text-xs/relaxed font-normal text-muted-foreground line-clamp-2 group-data-[size=xs]/item:text-xs/relaxed [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Actions ───

function Actions(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot="item-actions"
			class={cn("flex flex-row items-center gap-2", local.class)}
			{...rest}
		/>
	);
}

// ─── Header ───

function Header(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot="item-header"
			class={cn(
				"flex basis-full flex-row items-center justify-between gap-2",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Footer ───

function Footer(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot="item-footer"
			class={cn(
				"flex basis-full flex-row items-center justify-between gap-2",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Exports ───

export const Item = Object.assign(Root, {
	Group,
	Separator: ItemSeparator,
	Media,
	Content: ItemContent,
	Title,
	Description,
	Actions,
	Header,
	Footer,
});
