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
				"group/field flex w-full flex-col gap-2 data-[invalid=true]:text-destructive [&>.sr-only]:w-auto",
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
				"text-muted-foreground group-data-[disabled=true]/field:opacity-50",
				"has-data-checked:border-primary has-data-checked:bg-primary/5 dark:has-data-checked:bg-primary/10",
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
				"text-left text-xs/relaxed font-normal leading-normal text-muted-foreground",
				"last:mt-0",
				"group-has-data-[orientation=horizontal]/field:text-balance",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Value(props: ParentProps<ComponentProps<"p">>) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<p data-slot="field-value" class={cn("text-sm", local.class)} {...rest}>
			<Show
				when={local.children}
				fallback={
					<>
						<span class="text-muted-foreground" aria-hidden="true">
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
				"flex flex-row items-center gap-2 text-xs font-normal text-destructive",
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
