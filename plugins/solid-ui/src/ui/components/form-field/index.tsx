import { text, textStrong } from "@fcalell/ui-core/variants";
import { createUniqueId, type JSX, Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { FieldContext } from "#lib/field";

// A labelled typing control in a form: the label over the control, the
// description under the label, the error under the control.
export type FormFieldProps = Closed & {
	label: string;
	description?: string;
	error?: string;
	children?: JSX.Element;
};

export function FormField(props: FormFieldProps) {
	const id = createUniqueId();
	return (
		<FieldContext.Provider
			value={{ id, invalid: () => props.error !== undefined }}
		>
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
				{props.children}
				<Show when={props.error}>
					<p role="alert" class={cn(text({ role: "meta" }), "text-danger")}>
						{props.error}
					</p>
				</Show>
			</div>
		</FieldContext.Provider>
	);
}
