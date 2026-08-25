import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Root ───

type RootProps = ComponentProps<"table"> & {
	bordered?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["bordered"]);
	return (
		<div class="relative w-full overflow-auto">
			<table
				class={cn(
					"w-full caption-bottom text-callout",
					local.bordered && "border",
				)}
				{...rest}
			/>
		</div>
	);
}

// ─── Header ───

function Header(
	props: ComponentProps<"thead"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <thead class="[&_tr]:border-b" {...props} />;
}

// ─── Body ───

function Body(
	props: ComponentProps<"tbody"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <tbody class="[&_tr:last-child]:border-0" {...props} />;
}

// ─── Footer ───

function TableFooter(
	props: ComponentProps<"tfoot"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<tfoot class="border-t bg-surface-2 font-medium text-ink-3" {...props} />
	);
}

// ─── Row ───

function Row(
	props: ComponentProps<"tr"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<tr
			class="border-b hover:bg-surface-2 data-[state=selected]:bg-surface-2"
			{...props}
		/>
	);
}

// ─── Head ───

function Head(
	props: ComponentProps<"th"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<th
			scope="col"
			class="h-10 px-2 text-left align-middle font-medium text-ink-3 [&:has([role=checkbox])]:pr-0"
			{...props}
		/>
	);
}

// ─── Cell ───

function Cell(
	props: ComponentProps<"td"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<td
			class="p-2 align-middle [&:has([role=checkbox])]:pr-0"
			{...props}
		/>
	);
}

// ─── Caption ───

function Caption(
	props: ComponentProps<"caption"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <caption class="mt-4 text-callout text-ink-3" {...props} />;
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
