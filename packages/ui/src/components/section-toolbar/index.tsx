import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

type RootProps = ComponentProps<"div"> & {
	"aria-label"?: string;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["class", "aria-label"]);
	return (
		<div
			role="toolbar"
			aria-orientation="horizontal"
			aria-label={local["aria-label"] ?? "Section actions"}
			class={cn(
				"flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-4 py-3 sm:px-6",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Left(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn("flex min-w-0 flex-1 items-center gap-3", local.class)}
			{...rest}
		/>
	);
}

function Right(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return <div class={cn("flex items-center gap-2", local.class)} {...rest} />;
}

export const SectionToolbar = Object.assign(Root, { Left, Right });
