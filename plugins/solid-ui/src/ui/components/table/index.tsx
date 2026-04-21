import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Root ───

type RootProps = ComponentProps<"table"> & {
	containerClass?: string;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["class", "containerClass"]);
	return (
		<div class={cn("relative w-full overflow-auto", local.containerClass)}>
			<table
				class={cn("w-full caption-bottom text-sm", local.class)}
				{...rest}
			/>
		</div>
	);
}

// ─── Header ───

function Header(props: ComponentProps<"thead">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <thead class={cn("[&_tr]:border-b", local.class)} {...rest} />;
}

// ─── Body ───

function Body(props: ComponentProps<"tbody">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...rest} />
	);
}

// ─── Footer ───

function TableFooter(props: ComponentProps<"tfoot">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<tfoot
			class={cn(
				"border-t bg-muted/50 font-medium text-muted-foreground",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Row ───

function Row(props: ComponentProps<"tr">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<tr
			class={cn(
				"border-b hover:bg-muted/50 data-[state=selected]:bg-muted",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Head ───

function Head(props: ComponentProps<"th">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<th
			scope="col"
			class={cn(
				"h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Cell ───

function Cell(props: ComponentProps<"td">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<td
			class={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", local.class)}
			{...rest}
		/>
	);
}

// ─── Caption ───

function Caption(props: ComponentProps<"caption">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<caption
			class={cn("mt-4 text-sm text-muted-foreground", local.class)}
			{...rest}
		/>
	);
}

// ─── Exports ───

export const Table = Object.assign(Root, {
	Header,
	Body,
	Footer: TableFooter,
	Row,
	Head,
	Cell,
	Caption,
});
