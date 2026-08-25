import { Polymorphic } from "@kobalte/core/polymorphic";
import { CircleAlert } from "lucide-solid";
import type { ComponentProps, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { labelClass } from "#lib/label";

function Root(
	props: ComponentProps<"fieldset"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<fieldset
			data-slot="field"
			class="group/field flex w-full flex-col gap-2 data-[invalid=true]:text-danger [&>.sr-only]:w-auto"
			{...props}
		/>
	);
}

function Content(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			data-slot="field-content"
			class="group/field-content flex flex-1 flex-col gap-0.5 leading-snug"
			{...props}
		/>
	);
}

// The label element is rendered here rather than through `Label`: both compose
// the same `labelClass` base, and the field-state lines ride on top of it.
function FieldLabel(
	props: ComponentProps<"label"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<Polymorphic
			as="label"
			data-slot="field-label"
			class={cn(
				labelClass,
				"flex w-fit flex-row items-stretch gap-2",
				"group-data-[disabled=true]/field:opacity-50",
				"has-data-checked:border-ink-1 has-data-checked:bg-interactive-soft",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border *:data-[slot=field]:p-2",
				"group/field-label peer/field-label",
			)}
			{...props}
		/>
	);
}

function Description(
	props: ComponentProps<"p"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<p
			data-slot="field-description"
			class={cn(
				"text-left text-caption font-normal text-ink-3",
				"last:mt-0",
				"group-has-data-[orientation=horizontal]/field:text-balance",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-ink-1",
			)}
			{...props}
		/>
	);
}

function Value(
	props: ParentProps<
		ComponentProps<"p"> & {
			class?: never;
			style?: never;
			classList?: never;
		}
	>,
) {
	const [local, rest] = splitProps(props, ["children"]);
	return (
		<p data-slot="field-value" class="text-callout" {...rest}>
			<Show
				when={local.children}
				fallback={
					<>
						<span class="text-ink-3" aria-hidden="true">
							—
						</span>
						<span class="sr-only">No value</span>
					</>
				}
			>
				{local.children}
			</Show>
		</p>
	);
}

function FieldError(
	props: ParentProps<
		ComponentProps<"output"> & {
			class?: never;
			style?: never;
			classList?: never;
		}
	>,
) {
	const [local, rest] = splitProps(props, ["children"]);
	return (
		<output
			data-slot="field-error"
			class="flex flex-row items-center gap-2 text-caption font-normal text-danger"
			{...rest}
		>
			<CircleAlert class="size-4 shrink-0" aria-hidden="true" />
			<span>{local.children}</span>
		</output>
	);
}

export const Field = Object.assign(Root, {
	Content,
	Label: FieldLabel,
	Description,
	Value,
	Error: FieldError,
});
