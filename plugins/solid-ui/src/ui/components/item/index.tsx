import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { createUniqueId, mergeProps, splitProps } from "solid-js";

// ─── Group ───

function Group(
	props: ComponentProps<"ul"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<ul
			class="flex w-full list-none flex-col gap-4 has-data-[size=sm]:gap-2 has-data-[size=xs]:gap-2"
			{...props}
		/>
	);
}

// ─── ItemSeparator ───

function ItemSeparator(
	props: ComponentProps<"hr"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <hr class="my-2 h-px w-full shrink-0 border-0 bg-edge" {...props} />;
}

// ─── Root ───

const itemClasses = cva(
	"group/item flex w-full flex-wrap items-center rounded-control text-caption outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:border-interactive focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2",
	{
		variants: {
			variant: {
				default: "border border-transparent",
				outline: "border-2 border-edge",
				muted: "border border-transparent bg-surface-2",
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

type ItemProps = ComponentProps<"li"> &
	VariantProps<typeof itemClasses> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Root(props: ItemProps) {
	const merged = mergeProps(
		{ variant: "default" as const, size: "default" as const },
		props,
	);
	const [local, rest] = splitProps(merged, ["variant", "size"]);
	return (
		<li
			data-slot="item"
			data-variant={local.variant}
			data-size={local.size}
			class={itemClasses({ variant: local.variant, size: local.size })}
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

type MediaProps = ComponentProps<"div"> &
	VariantProps<typeof itemMediaClasses> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Media(props: MediaProps) {
	const merged = mergeProps({ variant: "default" as const }, props);
	const [local, rest] = splitProps(merged, ["variant"]);
	return (
		<div
			data-slot="item-media"
			data-variant={local.variant}
			class={itemMediaClasses({ variant: local.variant })}
			{...rest}
		/>
	);
}

// ─── Content ───

function ItemContent(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			data-slot="item-content"
			class="flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none"
			{...props}
		/>
	);
}

// ─── Title ───

function Title(
	props: ComponentProps<"span"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	const titleId = createUniqueId();
	const [local, rest] = splitProps(props, ["id"]);
	return (
		<span
			data-slot="item-title"
			id={local.id ?? titleId}
			class="flex w-fit flex-row items-center gap-2 text-caption font-medium underline-offset-4 line-clamp-1"
			{...rest}
		/>
	);
}

// ─── Description ───

function Description(
	props: ComponentProps<"p"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	const descId = createUniqueId();
	const [local, rest] = splitProps(props, ["id"]);
	return (
		<p
			data-slot="item-description"
			id={local.id ?? descId}
			class="text-left text-caption font-normal text-ink-3 line-clamp-2 group-data-[size=xs]/item:text-caption [&>a:hover]:text-ink-1 [&>a]:underline [&>a]:underline-offset-4"
			{...rest}
		/>
	);
}

// ─── Actions ───

function Actions(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			data-slot="item-actions"
			class="flex flex-row items-center gap-2"
			{...props}
		/>
	);
}

// ─── Header ───

function Header(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			data-slot="item-header"
			class="flex basis-full flex-row items-center justify-between gap-2"
			{...props}
		/>
	);
}

// ─── Footer ───

function Footer(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			data-slot="item-footer"
			class="flex basis-full flex-row items-center justify-between gap-2"
			{...props}
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
