import type { Option } from "@fcalell/ui-core/descriptors";
import { GROUP, row, text } from "@fcalell/ui-core/variants";
import * as PopoverPrimitive from "@kobalte/core/popover";
import { Check, ChevronDown } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useWords } from "#lib/words.tsx";
import { Input } from "../input/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A control showing its value; a tap opens one-line rows with a tick,
// anchored, up to six options, and a searchable sheet above six. A pick,
// never a form.
export type PickerProps = Closed & {
	label: string;
	options: Option[];
	value: string;
	onChange: (value: string) => void;
};

const ANCHORED_MAX = 6;

const ROW =
	"flex w-full cursor-pointer items-center text-left transition-colors duration-(--duration-fast) ease-ui hover:bg-edge focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint";

function Rows(props: {
	options: Option[];
	value: string;
	onPick: (value: string) => void;
}) {
	return (
		<ul class="flex flex-col">
			<For each={props.options}>
				{(option) => (
					<li>
						<button
							type="button"
							role="option"
							aria-selected={option.value === props.value}
							onClick={() => props.onPick(option.value)}
							class={cn(row({ state: "rest" }), ROW)}
						>
							<span class={cn(text({ role: "body" }), "flex-1 truncate")}>
								{option.label}
							</span>
							<Show when={option.value === props.value}>
								<Check class="size-5 shrink-0 text-tint" aria-hidden="true" />
							</Show>
						</button>
					</li>
				)}
			</For>
		</ul>
	);
}

export function Picker(props: PickerProps) {
	const words = useWords();
	const [open, setOpen] = createSignal(false);
	const [query, setQuery] = createSignal("");
	const current = () =>
		props.options.find((option) => option.value === props.value);
	const searchable = () => props.options.length > ANCHORED_MAX;
	const filtered = createMemo(() => {
		const needle = query().trim().toLowerCase();
		if (!needle) return props.options;
		return props.options.filter((option) =>
			option.label.toLowerCase().includes(needle),
		);
	});
	const pick = (value: string) => {
		props.onChange(value);
		setOpen(false);
		setQuery("");
	};
	const control = (
		<button
			type="button"
			aria-label={props.label}
			aria-haspopup="listbox"
			aria-expanded={open()}
			onClick={() => setOpen(true)}
			class={cn(
				GROUP,
				text({ role: "body" }),
				"inline-flex min-h-11 max-w-full cursor-pointer items-center gap-row rounded-full px-4 transition-colors duration-(--duration-fast) ease-ui hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint",
			)}
		>
			<span class="truncate">{current()?.label ?? props.label}</span>
			<ChevronDown class="size-4 shrink-0 text-ink-meta" aria-hidden="true" />
		</button>
	);
	return (
		<Show
			when={searchable()}
			fallback={
				<PopoverPrimitive.Root
					open={open()}
					onOpenChange={setOpen}
					placement="bottom-start"
				>
					{/* The anchor wraps the control, so it carries the bound that
					    lets a long value truncate inside a row. */}
					<PopoverPrimitive.Anchor class="min-w-0 max-w-full">
						{control}
					</PopoverPrimitive.Anchor>
					<PopoverPrimitive.Portal>
						<PopoverPrimitive.Content
							class={cn(
								GROUP,
								"z-50 min-w-48 overflow-hidden bg-surface shadow-float outline-none animate-content-hide data-[expanded]:animate-content-show",
							)}
						>
							<Rows options={props.options} value={props.value} onPick={pick} />
						</PopoverPrimitive.Content>
					</PopoverPrimitive.Portal>
				</PopoverPrimitive.Root>
			}
		>
			{control}
			<Sheet open={open()} onClose={() => setOpen(false)} title={props.label}>
				<Input
					kind="search"
					value={query()}
					onChange={setQuery}
					placeholder={words.search}
				/>
				<Rows options={filtered()} value={props.value} onPick={pick} />
			</Sheet>
		</Show>
	);
}
