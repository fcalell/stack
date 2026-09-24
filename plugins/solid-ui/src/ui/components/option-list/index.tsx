import type { Option } from "@fcalell/ui-core/descriptors";
import { checkbox, row, text, textStrong } from "@fcalell/ui-core/variants";
import * as RadioGroup from "@kobalte/core/radio-group";
import { For, type JSX, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useWords } from "#lib/words.tsx";

// Radio rows with a description line, the recommended one marked; the
// children sit under the chosen option.
export type OptionListProps = Closed & {
	options: Option[];
	value?: string;
	onChange: (value: string) => void;
	children?: JSX.Element;
};

export function OptionList(props: OptionListProps) {
	const words = useWords();
	return (
		<RadioGroup.Root
			value={props.value}
			onChange={props.onChange}
			class="flex flex-col"
		>
			<For each={props.options}>
				{(option) => {
					const chosen = () => option.value === props.value;
					return (
						<>
							<RadioGroup.Item value={option.value}>
								<RadioGroup.ItemInput class="peer" />
								<RadioGroup.ItemLabel
									class={cn(
										row({ state: chosen() ? "selected" : "rest" }),
										"flex w-full cursor-pointer items-center rounded-group text-left transition-colors duration-(--duration-fast) ease-ui hover:bg-edge peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-tint",
									)}
								>
									<RadioGroup.ItemControl
										class={cn(
											checkbox({ state: chosen() ? "checked" : "unchecked" }),
											"inline-flex size-5 shrink-0 items-center justify-center",
										)}
									>
										<RadioGroup.ItemIndicator class="size-2 rounded-full bg-on-accent" />
									</RadioGroup.ItemControl>
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="flex items-center gap-row">
											<span
												class={cn(
													text({ role: "body" }),
													textStrong({ role: "body" }),
												)}
											>
												{option.label}
											</span>
											<Show when={option.recommended}>
												<span class={cn(text({ role: "label" }), "text-tint")}>
													{words.recommended}
												</span>
											</Show>
										</span>
										<Show when={option.description}>
											<RadioGroup.ItemDescription
												class={text({ role: "meta" })}
											>
												{option.description}
											</RadioGroup.ItemDescription>
										</Show>
									</span>
								</RadioGroup.ItemLabel>
							</RadioGroup.Item>
							<Show when={chosen() && props.children}>
								<div class="px-inset pb-stack">{props.children}</div>
							</Show>
						</>
					);
				}}
			</For>
		</RadioGroup.Root>
	);
}
