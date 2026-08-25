import { Polymorphic } from "@kobalte/core/polymorphic";
import type {
	ComponentProps,
	JSX,
	ParentProps,
	ValidComponent,
} from "solid-js";
import { children as resolveChildren, Show, splitProps } from "solid-js";

type EmptyStateProps = ParentProps<
	ComponentProps<"div"> & {
		icon?: JSX.Element;
		title: string;
		titleAs?: ValidComponent;
		description?: string;
		class?: never;
		style?: never;
		classList?: never;
	}
>;

function EmptyState(props: EmptyStateProps) {
	const [local, rest] = splitProps(props, [
		"icon",
		"title",
		"titleAs",
		"description",
		"children",
	]);
	const resolved = resolveChildren(() => local.children);
	return (
		<div
			role="status"
			class="flex flex-col items-center justify-center gap-4 py-16 text-center"
			{...rest}
		>
			<Show when={local.icon}>
				<div aria-hidden="true" class="text-edge [&_svg]:size-12">
					{local.icon}
				</div>
			</Show>
			<div class="flex flex-col items-center gap-2">
				<Polymorphic
					as={local.titleAs ?? "h3"}
					class="text-callout font-bold uppercase tracking-widest text-ink-1"
				>
					{local.title}
				</Polymorphic>
				<Show when={local.description}>
					<p class="text-callout text-ink-3">{local.description}</p>
				</Show>
			</div>
			<Show when={resolved()}>
				<div class="flex flex-row items-center gap-2">{resolved()}</div>
			</Show>
		</div>
	);
}

export type { EmptyStateProps };
export { EmptyState };
