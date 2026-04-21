import { Polymorphic } from "@kobalte/core/polymorphic";
import type {
	ComponentProps,
	JSX,
	ParentProps,
	ValidComponent,
} from "solid-js";
import { children as resolveChildren, Show, splitProps } from "solid-js";
import { cn } from "#lib/cn";

type EmptyStateProps = ParentProps<
	ComponentProps<"div"> & {
		icon?: JSX.Element;
		title: string;
		titleAs?: ValidComponent;
		description?: string;
	}
>;

function EmptyState(props: EmptyStateProps) {
	const [local, rest] = splitProps(props, [
		"class",
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
			class={cn(
				"flex flex-col items-center justify-center gap-4 py-16 text-center",
				local.class,
			)}
			{...rest}
		>
			<Show when={local.icon}>
				<div aria-hidden="true" class="text-border [&_svg]:size-12">
					{local.icon}
				</div>
			</Show>
			<div class="flex flex-col items-center gap-2">
				<Polymorphic
					as={local.titleAs ?? "h3"}
					class="text-sm font-bold uppercase tracking-widest text-foreground"
				>
					{local.title}
				</Polymorphic>
				<Show when={local.description}>
					<p class="text-sm text-muted-foreground">{local.description}</p>
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
