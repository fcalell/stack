import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { field, GROUP, row, text } from "@fcalell/ui-core/variants";
import * as PopoverPrimitive from "@kobalte/core/popover";
import { Check, ChevronDown } from "lucide-solid";
import { createMemo, createSignal, createUniqueId, For, Show } from "solid-js";
import { useCell } from "#lib/cell.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useField } from "#lib/field.ts";
import { RING, RING_INSET, WASH } from "#lib/interact.ts";
import { useWords } from "#lib/words.tsx";
import { Input } from "../input/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A control showing its value; a tap opens one-line rows with a tick,
// anchored, up to six options, and a searchable sheet above six. Options
// may come in groups, each under its label in the list and the sheet. The
// value of a `DefinitionRow` when the pick applies at once; the control of a
// `FormField` when it is part of what a form submits, where it takes the
// field's surface, its label and its error.
export type PickerProps = Closed & {
	label: string;
	options: readonly Option[] | readonly OptionGroup[];
	value: string;
	onChange: (value: string) => void;
};

const ANCHORED_MAX = 6;

const ROW = cn(
	"flex w-full cursor-pointer items-center text-left transition-colors duration-(--duration-fast) ease-ui",
	WASH,
	RING_INSET,
);

// The options as groups: a flat list is one group with no label.
type Grouped = { label?: string; options: readonly Option[] };

function grouped(options: PickerProps["options"]): readonly Grouped[] {
	const first = options[0];
	if (first === undefined || !("options" in first)) {
		return [{ options: options as readonly Option[] }];
	}
	return options as readonly OptionGroup[];
}

function Rows(props: {
	groups: readonly Grouped[];
	value: string;
	onPick: (value: string) => void;
}) {
	return (
		<div class="flex flex-col">
			<For each={props.groups}>
				{(group) => {
					const heading = createUniqueId();
					return (
						<Show when={group.options.length > 0}>
							<fieldset
								class="min-w-0"
								aria-labelledby={group.label ? heading : undefined}
							>
								<Show when={group.label}>
									<p
										id={heading}
										class={cn(
											text({ role: "label" }),
											"px-inset pt-stack pb-pair",
										)}
									>
										{group.label}
									</p>
								</Show>
								<ul class="flex flex-col">
									<For each={group.options}>
										{(option) => (
											<li>
												<button
													type="button"
													role="option"
													aria-selected={option.value === props.value}
													onClick={() => props.onPick(option.value)}
													class={cn(row({ state: "rest" }), ROW)}
												>
													<span
														class={cn(
															text({ role: "body" }),
															"flex-1 truncate",
														)}
													>
														{option.label}
													</span>
													<Show when={option.value === props.value}>
														<Check
															class="size-5 shrink-0 text-tint"
															aria-hidden="true"
														/>
													</Show>
												</button>
											</li>
										)}
									</For>
								</ul>
							</fieldset>
						</Show>
					);
				}}
			</For>
		</div>
	);
}

export function Picker(props: PickerProps) {
	const words = useWords();
	const ctx = useField();
	const cell = useCell();
	// Editing a table cell, the picker opens as it mounts and hands the cell
	// back once it closes.
	const [open, setOpenSignal] = createSignal(cell !== undefined);
	const setOpen = (next: boolean) => {
		setOpenSignal(next);
		if (!next) cell?.close();
	};
	const [query, setQuery] = createSignal("");
	const groups = createMemo(() => grouped(props.options));
	const all = () => groups().flatMap((group) => [...group.options]);
	const current = () => all().find((option) => option.value === props.value);
	const searchable = () => all().length > ANCHORED_MAX;
	const filtered = createMemo(() => {
		const needle = query().trim().toLowerCase();
		if (!needle) return groups();
		return groups().map((group) => ({
			label: group.label,
			options: group.options.filter((option) =>
				option.label.toLowerCase().includes(needle),
			),
		}));
	});
	const pick = (value: string) => {
		props.onChange(value);
		setOpen(false);
		setQuery("");
	};
	// In a field the label names the control through its `for`; alone, its
	// own label does. `min-w-0` lets a long value truncate inside a row.
	const controlClass = () =>
		cn(
			ctx
				? cn(
						field({ kind: "text", state: "default" }),
						"flex w-full focus-visible:border-tint aria-invalid:border-danger",
					)
				: cn(
						GROUP,
						text({ role: "body" }),
						"inline-flex min-h-floor min-w-0 max-w-full rounded-full px-4",
						RING,
					),
			"cursor-pointer items-center gap-row text-left transition-colors duration-(--duration-fast) ease-ui",
			WASH,
		);
	const face = () => (
		<>
			<span class={cn("min-w-0 truncate", ctx && "flex-1")}>
				{current()?.label ?? props.label}
			</span>
			<ChevronDown class="size-4 shrink-0 text-ink-meta" aria-hidden="true" />
		</>
	);
	return (
		<Show
			when={searchable()}
			fallback={
				<PopoverPrimitive.Root
					open={open()}
					onOpenChange={setOpen}
					placement="bottom-start"
					sameWidth={ctx !== undefined}
				>
					{/* The trigger toggles and is the anchor, and the open list's
					    outside press ignores it, so a press on the open control
					    closes the list instead of closing and reopening it. */}
					<PopoverPrimitive.Trigger
						id={ctx?.id}
						aria-label={ctx ? undefined : props.label}
						aria-invalid={ctx?.invalid() ? "true" : undefined}
						aria-haspopup="listbox"
						class={controlClass()}
					>
						{face()}
					</PopoverPrimitive.Trigger>
					<PopoverPrimitive.Portal>
						<PopoverPrimitive.Content
							class={cn(
								GROUP,
								"z-50 min-w-48 overflow-hidden bg-surface shadow-float outline-none animate-content-hide data-[expanded]:animate-content-show",
							)}
						>
							<Rows groups={groups()} value={props.value} onPick={pick} />
						</PopoverPrimitive.Content>
					</PopoverPrimitive.Portal>
				</PopoverPrimitive.Root>
			}
		>
			<button
				type="button"
				id={ctx?.id}
				aria-label={ctx ? undefined : props.label}
				aria-invalid={ctx?.invalid() ? "true" : undefined}
				aria-haspopup="listbox"
				aria-expanded={open()}
				onClick={() => setOpen(true)}
				class={controlClass()}
			>
				{face()}
			</button>
			<Sheet open={open()} onClose={() => setOpen(false)} title={props.label}>
				<Input
					kind="search"
					value={query()}
					onChange={setQuery}
					placeholder={words.search}
				/>
				<Rows groups={filtered()} value={props.value} onPick={pick} />
			</Sheet>
		</Show>
	);
}
