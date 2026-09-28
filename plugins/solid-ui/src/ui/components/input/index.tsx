import type { Act } from "@fcalell/ui-core/descriptors";
import { field, text } from "@fcalell/ui-core/variants";
import { Search } from "lucide-solid";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useField } from "#lib/field.ts";
import { TEXT_ACT } from "#lib/interact.ts";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "code"
	| "source"
	| "number";

// A one-line typing control. `search` is a pill, the rest take the group
// radius; `number` opens the numeric keyboard and draws `unit` after the
// value; `code` is a one-time code; `source` is typed text a machine reads
// (a command, a path, a host), mono and never corrected or capitalized;
// `act` is a trailing text act inside the field. Inside a `FormField` it
// takes the field's id and error.
export type InputProps = Closed & {
	kind?: InputKind;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	unit?: string;
	act?: Act;
};

const TYPE: Record<InputKind, string> = {
	text: "text",
	search: "search",
	secret: "password",
	code: "text",
	source: "text",
	number: "text",
};

// The focused and error cells are reached by selector: the wrapper is the
// field surface and the input inside it is bare.
export const FIELD_SHELL =
	"flex items-center gap-row focus-within:border-tint aria-invalid:border-danger";

export function Input(props: InputProps) {
	const kind = () => props.kind ?? "text";
	const surface = () =>
		kind() === "search"
			? "search"
			: kind() === "code" || kind() === "source"
				? "code"
				: "text";
	const source = () => kind() === "source";
	const ctx = useField();
	let input!: HTMLInputElement;
	return (
		// A tap on the field's padding focuses the input, so the whole 44 px
		// surface is the target.
		<div
			class={cn(field({ kind: surface(), state: "default" }), FIELD_SHELL)}
			aria-invalid={ctx?.invalid() ? "true" : undefined}
			onPointerDown={(event) => {
				if (event.target !== event.currentTarget) return;
				event.preventDefault();
				input.focus();
			}}
		>
			<Show when={kind() === "search"}>
				<Search class="size-5 shrink-0 text-ink-meta" aria-hidden="true" />
			</Show>
			<input
				ref={input}
				id={ctx?.id}
				type={TYPE[kind()]}
				inputmode={kind() === "number" ? "decimal" : undefined}
				autocomplete={
					kind() === "code" ? "one-time-code" : source() ? "off" : undefined
				}
				spellcheck={source() ? false : undefined}
				autocapitalize={source() ? "off" : undefined}
				autocorrect={source() ? "off" : undefined}
				value={props.value}
				placeholder={props.placeholder}
				aria-invalid={ctx?.invalid() ? "true" : undefined}
				onInput={(event) => props.onChange(event.currentTarget.value)}
				class={cn(
					"min-w-0 flex-1 bg-transparent outline-none",
					"placeholder:text-ink-faint",
				)}
			/>
			<Show when={kind() === "number" && props.unit}>
				<span class={cn(text({ role: "meta" }), "shrink-0")}>{props.unit}</span>
			</Show>
			<Show when={props.act}>
				{(act) => (
					<button
						type="button"
						disabled={act().blocked !== undefined}
						onClick={() => act().onAct()}
						class={cn(
							text({ role: "meta" }),
							// The field's own padding given to the act, so its hit
							// area is the field's right end at the 44 px floor.
							"-my-2 -mr-4 min-h-11 shrink-0 px-4",
							TEXT_ACT,
						)}
					>
						{act().label}
					</button>
				)}
			</Show>
		</div>
	);
}
