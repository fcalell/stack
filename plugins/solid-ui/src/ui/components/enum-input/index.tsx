import { field, text } from "@fcalell/ui-core/variants";
import { createSignal, createUniqueId, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { TEXT_ACT } from "#lib/interact.ts";
import { useWords } from "#lib/words.tsx";
import { Input } from "../input/index.tsx";

// A list of string values a machine reads (a schema's allowed values): each
// value on a `source` cell with its remove act, then a `source` field that
// adds the next one on its act or on Enter. A value already listed is
// refused, and the field says so under it. Order is the order of adding.
// Inside a `FormField` the field takes the field's id and error.
export type EnumInputProps = Closed & {
	value: readonly string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
};

export function EnumInput(props: EnumInputProps) {
	const words = useWords();
	const [draft, setDraft] = createSignal("");
	let root!: HTMLFieldSetElement;
	const next = () => draft().trim();
	const duplicate = () => props.value.includes(next());
	const add = () => {
		if (!next() || duplicate()) return;
		props.onChange([...props.value, next()]);
		setDraft("");
	};
	const remove = (at: number) => {
		props.onChange(props.value.filter((_, index) => index !== at));
		// The removed act is gone, so focus goes back to the field.
		root.querySelector<HTMLInputElement>("input")?.focus();
	};
	return (
		<fieldset
			ref={root}
			class="flex min-w-0 flex-col gap-pair"
			onKeyDown={(event) => {
				if (
					event.key !== "Enter" ||
					!(event.target instanceof HTMLInputElement)
				)
					return;
				// Enter adds the value and never submits the form around it.
				event.preventDefault();
				add();
			}}
		>
			<Show when={props.value.length > 0}>
				<ul class="flex flex-col gap-pair">
					<For each={props.value}>
						{(item, at) => {
							const id = createUniqueId();
							return (
								<li
									class={cn(
										field({ kind: "code", state: "default" }),
										"flex items-center gap-row",
									)}
								>
									<span id={id} class="min-w-0 flex-1 truncate">
										{item}
									</span>
									<button
										type="button"
										aria-describedby={id}
										onClick={() => remove(at())}
										class={cn(
											text({ role: "meta" }),
											// The cell's own padding given to the act, so its hit
											// area is the cell's right end at the floor.
											"-my-control-y -mr-4 min-h-floor shrink-0 px-4",
											TEXT_ACT,
										)}
									>
										{words.remove}
									</button>
								</li>
							);
						}}
					</For>
				</ul>
			</Show>
			<Input
				kind="source"
				value={draft()}
				onChange={setDraft}
				placeholder={props.placeholder}
				act={
					next()
						? {
								label: words.add,
								onAct: add,
								blocked: duplicate() ? words.duplicate : undefined,
							}
						: undefined
				}
			/>
			<Show when={next() && duplicate()}>
				<p role="status" class={text({ role: "meta" })}>
					{words.duplicate}
				</p>
			</Show>
		</fieldset>
	);
}
