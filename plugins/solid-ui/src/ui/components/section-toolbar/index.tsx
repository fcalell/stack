import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

type RootProps = ComponentProps<"div"> & {
	"aria-label"?: string;
	class?: never;
	style?: never;
	classList?: never;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["aria-label"]);
	return (
		<div
			role="toolbar"
			aria-orientation="horizontal"
			aria-label={local["aria-label"] ?? "Section actions"}
			class="flex flex-wrap items-center justify-between gap-y-2 border-b border-edge px-4 py-3 sm:px-6"
			{...rest}
		/>
	);
}

function Left(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex min-w-0 flex-1 items-center gap-3" {...props} />;
}

function Right(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex items-center gap-2" {...props} />;
}

export const SectionToolbar = Object.assign(Root, { Left, Right });
