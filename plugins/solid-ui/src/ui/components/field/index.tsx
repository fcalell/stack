import { CircleAlert } from "lucide-solid";
import type { ComponentProps, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { Label } from "#components/label";
import { cn } from "#lib/cn";

function Root(props: ComponentProps<"fieldset">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<fieldset
			data-slot="field"
			class={cn(
				"group/field flex w-full flex-col gap-2 data-[invalid=true]:text-danger [&>.sr-only]:w-auto",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Content(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot="field-content"
			class={cn(
				"group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
				local.class,
			)}
			{...rest}
		/>
	);
}

function FieldLabel(props: ComponentProps<"label">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<Label
			data-slot="field-label"
			class={cn(
				"flex w-fit flex-row items-stretch gap-2 leading-snug",
				"text-ink-3 group-data-[disabled=true]/field:opacity-50",
				"has-data-checked:border-ink-1 has-data-checked:bg-interactive-soft",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border *:data-[slot=field]:p-2",
				"group/field-label peer/field-label",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Description(props: ComponentProps<"p">) {
	const [local, rest] = splitProps(props, ["id", "class"]);
	return (
		<p
			id={local.id}
			data-slot="field-description"
			class={cn(
				"text-left text-caption font-normal leading-normal text-ink-3",
				"last:mt-0",
				"group-has-data-[orientation=horizontal]/field:text-balance",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-ink-1",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Value(props: ParentProps<ComponentProps<"p">>) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<p
			data-slot="field-value"
			class={cn("text-callout", local.class)}
			{...rest}
		>
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

function FieldError(props: ParentProps<ComponentProps<"output">>) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<output
			data-slot="field-error"
			class={cn(
				"flex flex-row items-center gap-2 text-caption font-normal text-danger",
				local.class,
			)}
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
