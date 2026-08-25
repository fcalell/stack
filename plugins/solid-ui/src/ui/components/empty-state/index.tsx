import type { Action } from "@fcalell/ui-core/descriptors";
import { Polymorphic } from "@kobalte/core/polymorphic";
import type { LucideIcon } from "lucide-solid";
import type { ValidComponent } from "solid-js";
import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Button } from "#components/button";

type EmptyStateProps = {
	icon?: LucideIcon;
	title: string;
	// The documented `as`-hole, not a class channel.
	titleAs?: ValidComponent;
	description?: string;
	action?: Action<never>;
	class?: never;
	style?: never;
	classList?: never;
};

function EmptyState(props: EmptyStateProps) {
	return (
		<div
			role="status"
			class="flex flex-col items-center justify-center gap-4 py-16 text-center"
		>
			<Show when={props.icon}>
				{(icon) => (
					<div aria-hidden="true" class="text-edge">
						<Dynamic component={icon()} class="size-12" />
					</div>
				)}
			</Show>
			<div class="flex flex-col items-center gap-2">
				<Polymorphic
					as={props.titleAs ?? "h3"}
					class="text-callout font-bold uppercase tracking-widest text-ink-1"
				>
					{props.title}
				</Polymorphic>
				<Show when={props.description}>
					<p class="text-callout text-ink-3">{props.description}</p>
				</Show>
			</div>
			<Show when={props.action}>
				{(action) => (
					<Button
						emphasis="secondary"
						size="md"
						loading={action().loading}
						disabled={action().disabled}
						onClick={() => action().onSelect()}
					>
						{action().label}
					</Button>
				)}
			</Show>
		</div>
	);
}

export type { EmptyStateProps };
export { EmptyState };
