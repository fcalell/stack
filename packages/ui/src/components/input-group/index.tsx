import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { Textarea } from "#components/textarea";
import { cn } from "#lib/cn";

// ─── Root ───

type RootProps = ComponentProps<"fieldset"> & {
	legend?: string;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["class", "legend"]);
	return (
		<fieldset
			data-slot="input-group"
			aria-label={local.legend}
			class={cn(
				"relative flex h-8 w-full min-w-0 items-center rounded-md border-2 border-input bg-muted outline-none transition-colors has-[>textarea]:h-auto has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot][aria-invalid=true]]:border-destructive has-disabled:bg-card has-disabled:opacity-[0.38] has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5 in-data-[slot=combobox-content]:focus-within:border-inherit",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Addon ───

const addonClasses = cva(
	"flex h-auto cursor-text flex-row items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&:not(:has(>button))]:cursor-text [&>kbd]:rounded-none [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				"inline-start":
					"order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
				"inline-end":
					"order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
				"block-start":
					"order-first w-full justify-start px-3 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
				"block-end":
					"order-last w-full justify-start px-3 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
			},
		},
		defaultVariants: {
			align: "inline-start",
		},
	},
);

type AddonProps = ComponentProps<"div"> & VariantProps<typeof addonClasses>;

function Addon(props: AddonProps) {
	const merged = mergeProps({ align: "inline-start" as const }, props);
	const [local, rest] = splitProps(merged, ["class", "align"]);
	return (
		<div
			data-slot="input-group-addon"
			data-align={local.align}
			class={addonClasses({ align: local.align, className: local.class })}
			{...rest}
		/>
	);
}

// ─── GroupButton ───

const groupButtonClasses = cva(
	"flex flex-row items-center gap-2 rounded-none text-xs shadow-none",
	{
		variants: {
			size: {
				xs: "h-6 gap-1 px-2 [&>svg:not([class*='size-'])]:size-3.5",
				sm: "",
				"icon-xs": "size-6 p-0 has-[>svg]:p-0",
				"icon-sm": "size-8 p-0 has-[>svg]:p-0",
			},
		},
		defaultVariants: {
			size: "xs",
		},
	},
);

type GroupButtonProps = Omit<
	ComponentProps<"button"> & VariantProps<typeof groupButtonClasses>,
	"size"
> &
	VariantProps<typeof groupButtonClasses> & {
		variant?: "default" | "secondary" | "ghost" | "destructive" | "link";
		type?: "button" | "submit" | "reset";
	};

function GroupButton(props: GroupButtonProps) {
	const merged = mergeProps(
		{
			type: "button" as const,
			variant: "ghost" as const,
			size: "xs" as const,
		},
		props,
	);
	const [local, rest] = splitProps(merged, [
		"class",
		"type",
		"variant",
		"size",
	]);
	return (
		<Button
			type={local.type}
			variant={local.variant}
			class={groupButtonClasses({
				size: local.size,
				className: local.class,
			})}
			{...rest}
		/>
	);
}

// ─── Text ───

function GroupText(props: ComponentProps<"span">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<span
			class={cn(
				"flex flex-row items-center gap-2 text-xs text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── GroupInput ───

type GroupInputProps = Omit<ComponentProps<"input">, "size"> & {
	size?: "sm" | "default" | "lg";
};

function GroupInput(props: GroupInputProps) {
	const [local, rest] = splitProps(props, ["class", "size"]);
	return (
		<Input
			data-slot="input-group-control"
			size={local.size}
			class={cn(
				"flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── GroupTextarea ───

function GroupTextarea(props: ComponentProps<"textarea">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<Textarea
			data-slot="input-group-control"
			class={cn(
				"flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Exports ───

export const InputGroup = Object.assign(Root, {
	Addon,
	Button: GroupButton,
	Text: GroupText,
	Input: GroupInput,
	Textarea: GroupTextarea,
});
