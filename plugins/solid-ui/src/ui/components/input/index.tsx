import { commitMoment } from "@fcalell/ui-core/commit";
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
	| "source"
	| "number"
	| "email";

// A one-line typing control. `search` is a pill, the rest take the group
// radius; `number` opens the numeric keyboard and draws `unit` after the
// value; `source` is typed text a machine reads (a command, a path, a host),
// mono and never corrected or capitalized; `email` is an address: the email
// keyboard, the browser's saved address, never corrected or capitalized;
// `act` is a trailing text act inside the field. Inside a `FormField` it
// takes the field's id and error. `onCommit` hears the value once the viewer
// is done with it: on leaving the field or on Enter, only when it changed
// since the field took focus; with it, Escape puts back the value at focus.
export type InputProps = Closed & {
	kind?: InputKind;
	value: string;
	onChange: (value: string) => void;
	onCommit?: (value: string) => void;
	placeholder?: string;
	unit?: string;
	act?: Act;
};

const TYPE: Record<InputKind, string> = {
	text: "text",
	search: "search",
	secret: "password",
	source: "text",
	number: "text",
	email: "email",
};

// The focused and error cells are reached by selector: the wrapper is the
// field surface and the input inside it is bare.
export const FIELD_SHELL =
	"flex items-center gap-row focus-within:border-tint aria-invalid:border-danger";

export function Input(props: InputProps) {
	const kind = () => props.kind ?? "text";
	const surface = () =>
		kind() === "search" ? "search" : kind() === "source" ? "code" : "text";
	const source = () => kind() === "source";
	// Typed exactly as it reads: no correction, no capital, no spellcheck.
	const verbatim = () => source() || kind() === "email";
	const ctx = useField();
	const moment = commitMoment<string>();
	const commit = (value: string) => props.onCommit?.(value);
	let input!: HTMLInputElement;
	return (
		// A tap on the field's padding focuses the input, so the whole
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
				inputmode={
					kind() === "number"
						? "decimal"
						: kind() === "email"
							? "email"
							: undefined
				}
				autocomplete={
					kind() === "email" ? "email" : source() ? "off" : undefined
				}
				spellcheck={verbatim() ? false : undefined}
				autocapitalize={verbatim() ? "off" : undefined}
				autocorrect={verbatim() ? "off" : undefined}
				value={props.value}
				placeholder={props.placeholder}
				aria-invalid={ctx?.invalid() ? "true" : undefined}
				onInput={(event) => props.onChange(event.currentTarget.value)}
				onFocus={(event) => moment.focus(event.currentTarget.value)}
				onBlur={(event) => moment.leave(event.currentTarget.value, commit)}
				onKeyDown={(event) => {
					if (!props.onCommit || event.isComposing) return;
					const value = event.currentTarget.value;
					if (event.key === "Enter") {
						// The commit is the form's submit, so the form's own
						// implicit submission would send it twice.
						event.preventDefault();
						moment.commit(value, commit);
					} else if (event.key === "Escape") {
						moment.cancel(value, props.onChange);
					}
				}}
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
							// area is the field's right end at the floor.
							"-my-control-y -mr-4 min-h-floor shrink-0 px-4",
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
