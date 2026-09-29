import type { FieldBinding, FieldControl } from "@fcalell/ui-core/descriptors";
import { text, textStrong } from "@fcalell/ui-core/variants";
import { createUniqueId, type JSX, Show, untrack } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FieldContext } from "#lib/field.ts";

// A labelled typing control in a form: the label over the control, the
// description under the label, the error under the control. Bound to a form
// field (`field={form.bind("name")}`), it draws the field's error and hands
// the control its value and change handler, and an autosaving binding's
// commit, so the control is one spread: `{(control) => <Input {...control} />}`.
export type FormFieldProps<V = unknown> = Closed & {
	label: string;
	description?: string;
} & (
		| {
				field?: never;
				error?: string;
				children?: JSX.Element;
		  }
		| {
				field: FieldBinding<V>;
				error?: never;
				children: (control: FieldControl<V>) => JSX.Element;
		  }
	);

export function FormField<V>(props: FormFieldProps<V>) {
	const id = createUniqueId();
	const error = () => props.field?.error ?? props.error;
	// The control reads the binding through getters, so it follows the form
	// without the render function running again.
	const control: FieldControl<V> = {
		get value() {
			return (props.field as FieldBinding<V>).value;
		},
		onChange: (value) => props.field?.onChange(value),
		get onCommit() {
			return props.field?.onCommit;
		},
	};
	const body = () => {
		const children = props.children;
		return typeof children === "function"
			? untrack(() => children(control))
			: children;
	};
	return (
		<FieldContext.Provider value={{ id, invalid: () => error() !== undefined }}>
			<div class="flex flex-col gap-pair">
				<label
					for={id}
					class={cn(text({ role: "body" }), textStrong({ role: "body" }))}
				>
					{props.label}
				</label>
				<Show when={props.description}>
					<p class={text({ role: "meta" })}>{props.description}</p>
				</Show>
				{body()}
				<Show when={error()}>
					<p role="alert" class={cn(text({ role: "meta" }), "text-danger")}>
						{error()}
					</p>
				</Show>
			</div>
		</FieldContext.Provider>
	);
}
