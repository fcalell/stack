import { field, text } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useField } from "#lib/field.ts";

// Multi-line typing. `source` is mono and keeps indentation; `budget` is a
// word budget and draws a counter under the field.
export type TextAreaProps = Closed & {
	kind?: "prose" | "source";
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	budget?: number;
};

function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

export function TextArea(props: TextAreaProps) {
	const ctx = useField();
	const source = () => props.kind === "source";
	const count = () => wordCount(props.value);
	const over = () => props.budget !== undefined && count() > props.budget;
	return (
		<div class="flex flex-col gap-pair">
			<textarea
				id={ctx?.id}
				rows={4}
				value={props.value}
				placeholder={props.placeholder}
				spellcheck={!source()}
				aria-invalid={ctx?.invalid() || over() ? "true" : undefined}
				onInput={(event) => props.onChange(event.currentTarget.value)}
				class={cn(
					field({ kind: source() ? "code" : "text", state: "default" }),
					"min-h-28 w-full resize-y outline-none focus-visible:border-tint aria-invalid:border-danger",
					"placeholder:text-ink-faint",
					source() && "whitespace-pre",
				)}
			/>
			<Show when={props.budget}>
				{(budget) => (
					<p
						class={cn(
							text({ role: "meta" }),
							"text-right tabular-nums",
							over() && "text-danger",
						)}
					>
						{count()} / {budget()}
					</p>
				)}
			</Show>
		</div>
	);
}
