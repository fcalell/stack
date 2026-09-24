import type { Act } from "@fcalell/ui-core/descriptors";
import { field, text } from "@fcalell/ui-core/variants";
import { Search } from "lucide-solid";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useField } from "#lib/field.ts";

export type InputKind = "text" | "search" | "secret" | "code" | "number";

// A one-line typing control. `search` is a pill, the rest take the group
// radius; `number` opens the numeric keyboard; `act` is a trailing text act
// inside the field. Inside a `FormField` it takes the field's id and error.
export type InputProps = Closed & {
	kind?: InputKind;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	act?: Act;
};

const TYPE: Record<InputKind, string> = {
	text: "text",
	search: "search",
	secret: "password",
	code: "text",
	number: "text",
};

// The focused and error cells are reached by selector: the wrapper is the
// field surface and the input inside it is bare.
export const FIELD_SHELL =
	"flex items-center gap-row focus-within:border-tint aria-invalid:border-danger";

export function Input(props: InputProps) {
	const kind = () => props.kind ?? "text";
	const surface = () =>
		kind() === "search" ? "search" : kind() === "code" ? "code" : "text";
	const ctx = useField();
	return (
		<div
			class={cn(field({ kind: surface(), state: "default" }), FIELD_SHELL)}
			aria-invalid={ctx?.invalid() ? "true" : undefined}
		>
			<Show when={kind() === "search"}>
				<Search class="size-5 shrink-0 text-ink-meta" aria-hidden="true" />
			</Show>
			<input
				id={ctx?.id}
				type={TYPE[kind()]}
				inputmode={kind() === "number" ? "decimal" : undefined}
				autocomplete={kind() === "code" ? "one-time-code" : undefined}
				value={props.value}
				placeholder={props.placeholder}
				aria-invalid={ctx?.invalid() ? "true" : undefined}
				onInput={(event) => props.onChange(event.currentTarget.value)}
				class={cn(
					"min-w-0 flex-1 bg-transparent outline-none",
					"placeholder:text-ink-faint",
				)}
			/>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						disabled={act().blocked !== undefined}
						onClick={() => act().onAct()}
						class={cn(
							text({ role: "meta" }),
							"shrink-0 cursor-pointer font-medium text-tint disabled:text-ink-faint",
						)}
					>
						{act().label}
					</button>
				)}
			</Show>
		</div>
	);
}
