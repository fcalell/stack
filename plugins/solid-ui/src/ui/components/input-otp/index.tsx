import { CONTROL_MUTED, otpBox, text } from "@fcalell/ui-core/variants";
import { createSignal, For, onMount } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useField } from "#lib/field.ts";
import { focusIsFree } from "#lib/focus.ts";

// A one-time code: `length` boxes over one string of digits. One real input
// sits under the boxes, so the system's code suggestion, a paste of the whole
// code and a screen reader all meet a single field; the boxes draw it. The
// arrows move between boxes and a digit typed on a filled box replaces it.
// It takes focus when it is drawn unless the viewer is in another element, so
// the code step a sent code opens is typed into at once: the step replaced
// the button that sent it, and HTML `autofocus` acts only on a page's first
// load. `onComplete` hears the code once its last digit lands; `loading`
// holds the boxes while the code is checked, read-only rather than
// disabled, since disabling the input would drop its focus and a refused
// code's retry would type into nothing. Inside a `FormField` it takes the
// field's id and error.
export type InputOtpProps = Closed & {
	length: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	loading?: boolean;
};

export function InputOtp(props: InputOtpProps) {
	const ctx = useField();
	const [focused, setFocused] = createSignal(false);
	const [caret, setCaret] = createSignal(0);
	let input!: HTMLInputElement;
	const last = () => props.length - 1;
	const boxes = () =>
		Array.from({ length: props.length }, (_, at) => props.value[at] ?? "");
	// The caret on a filled box selects its digit, so the next one replaces
	// it; on the first empty box it sits collapsed.
	const place = (at: number) => {
		const clamped = Math.max(0, Math.min(at, props.value.length, last()));
		const end = clamped < props.value.length ? clamped + 1 : clamped;
		input.setSelectionRange(clamped, end);
		setCaret(clamped);
	};
	const accept = (raw: string) => {
		const next = raw.replace(/\D/g, "").slice(0, props.length);
		if (input.value !== next) input.value = next;
		if (next !== props.value) {
			props.onChange(next);
			if (next.length === props.length) props.onComplete?.(next);
		}
		return next;
	};
	onMount(() => {
		if (focusIsFree(document.activeElement)) input.focus();
	});
	const state = (at: number) =>
		ctx?.invalid()
			? "error"
			: focused() && at === caret()
				? "focused"
				: "default";
	return (
		<div class={cn("relative flex gap-row", props.loading && CONTROL_MUTED)}>
			<input
				ref={input}
				id={ctx?.id}
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				autocomplete="one-time-code"
				maxlength={props.length}
				value={props.value}
				readOnly={props.loading}
				aria-busy={props.loading || undefined}
				aria-invalid={ctx?.invalid() ? "true" : undefined}
				onFocus={() => {
					setFocused(true);
					place(props.value.length);
				}}
				onBlur={() => setFocused(false)}
				onInput={(event) => {
					accept(event.currentTarget.value);
					place(event.currentTarget.selectionStart ?? props.value.length);
				}}
				onPaste={(event) => {
					event.preventDefault();
					if (props.loading) return;
					const pasted = (event.clipboardData?.getData("text") ?? "").replace(
						/\D/g,
						"",
					);
					// A whole code replaces the value; a part lands at the caret.
					const next =
						pasted.length >= props.length
							? pasted
							: props.value.slice(0, caret()) +
								pasted +
								props.value.slice(caret() + pasted.length);
					place(accept(next).length);
				}}
				onKeyDown={(event) => {
					const moves: Record<string, number> = {
						ArrowLeft: caret() - 1,
						ArrowRight: caret() + 1,
						Home: 0,
						End: props.length,
					};
					const to = moves[event.key];
					if (to === undefined) return;
					event.preventDefault();
					place(to);
				}}
				class="pointer-events-none absolute inset-0 bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
			/>
			<For each={boxes()}>
				{(digit, at) => (
					// A tap on a box puts the caret on it, or on the first empty
					// box past the code typed so far.
					<div
						aria-hidden="true"
						onPointerDown={(event) => {
							event.preventDefault();
							if (props.loading) return;
							input.focus();
							place(at());
						}}
						class={cn(
							otpBox({ state: state(at()) }),
							"flex cursor-text items-center justify-center",
						)}
					>
						<span class={cn(text({ role: "heading" }), "tabular-nums")}>
							{digit}
						</span>
					</div>
				)}
			</For>
		</div>
	);
}
