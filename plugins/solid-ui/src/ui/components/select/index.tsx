import { field, text, textStrong } from "@fcalell/ui-core/variants";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import { Check, ChevronDown } from "lucide-solid";
import type { JSX, ValidComponent } from "solid-js";
import { createMemo, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { fieldMutedSelectorClass, fieldShellClass } from "#lib/field";

// ─── Option types ───

type SelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

type SelectOptionGroup = {
	label: string;
	options: SelectOption[];
};

type SelectOptions = SelectOption[] | SelectOptionGroup[];

function isGroupedOptions(
	options: SelectOptions,
): options is SelectOptionGroup[] {
	return (
		options.length > 0 &&
		typeof options[0] === "object" &&
		"options" in options[0] &&
		Array.isArray(options[0].options)
	);
}

function findOption(
	options: SelectOptions,
	value: string,
): SelectOption | undefined {
	if (isGroupedOptions(options)) {
		for (const group of options) {
			const found = group.options.find((opt) => opt.value === value);
			if (found) return found;
		}
		return undefined;
	}
	return options.find((opt) => opt.value === value);
}

// ─── Trigger (internal) ───

// The trigger is a field surface laid out as a row, so it takes the matrix's
// `row` layout rather than a size axis of its own.
const TRIGGER_BOX =
	"flex w-full flex-row items-center justify-between select-none text-left";

type TriggerProps<T extends ValidComponent = "button"> =
	SelectPrimitive.SelectTriggerProps<T> & {
		children?: JSX.Element;
	};

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	const [local, rest] = splitProps(props as TriggerProps, ["children"]);
	return (
		<SelectPrimitive.Trigger
			class={cn(
				field({ state: "default", layout: "row" }),
				fieldShellClass,
				TRIGGER_BOX,
				fieldMutedSelectorClass,
			)}
			{...rest}
		>
			{local.children}
			<SelectPrimitive.Icon>
				<ChevronDown class="size-4 shrink-0 text-ink-3" aria-hidden="true" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

// ─── Content (internal) ───

function Content() {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content class="z-50 overflow-hidden rounded-xl border-2 border-edge bg-surface text-ink-1 outline-none origin-[var(--kb-select-content-transform-origin)] animate-content-hide data-[expanded]:animate-content-show">
				<SelectPrimitive.Listbox class="max-h-60 overflow-x-hidden overflow-y-auto py-1" />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

// ─── Item (internal) ───

function Item(props: {
	item: SelectPrimitive.SelectItemProps["item"];
	children?: JSX.Element;
}) {
	return (
		<SelectPrimitive.Item
			item={props.item}
			class="relative flex w-full cursor-default flex-row items-center gap-2 px-4 py-2 text-callout outline-none transition-colors select-none hover:bg-surface-2 data-highlighted:bg-surface-2 data-disabled:pointer-events-none data-disabled:opacity-50"
		>
			<SelectPrimitive.ItemLabel class="flex flex-1 flex-row items-center gap-2">
				<span class="flex-1">{props.children}</span>
			</SelectPrimitive.ItemLabel>
			<SelectPrimitive.ItemIndicator>
				<Check class="size-4 shrink-0 text-current" aria-hidden="true" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

// ─── Section (internal) ───

function Section(props: { label: string }) {
	return (
		<SelectPrimitive.Section class="mt-1 first:mt-0">
			<SelectPrimitive.Label
				class={cn(
					text({ variant: "micro", tone: "ink-3" }),
					textStrong({ variant: "micro" }),
					"px-4 py-2 uppercase",
				)}
			>
				{props.label}
			</SelectPrimitive.Label>
		</SelectPrimitive.Section>
	);
}

// ─── Select (public) ───

type SelectProps = {
	options: SelectOptions;
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	"aria-invalid"?: boolean;
	disallowEmptySelection?: boolean;
	children?: (option: SelectOption) => JSX.Element;
	class?: never;
	style?: never;
	classList?: never;
};

function Select(props: SelectProps) {
	const grouped = createMemo(() => isGroupedOptions(props.options));

	return (
		<SelectPrimitive.Root<SelectOption, SelectOptionGroup>
			options={props.options as (SelectOption | SelectOptionGroup)[]}
			optionValue="value"
			optionTextValue="label"
			optionDisabled="disabled"
			optionGroupChildren={grouped() ? "options" : undefined}
			value={
				props.value !== undefined
					? (findOption(props.options, props.value) ?? null)
					: undefined
			}
			onChange={(opt) => {
				if (opt) props.onValueChange?.(opt.value);
			}}
			disabled={props.disabled}
			disallowEmptySelection={props.disallowEmptySelection ?? true}
			itemComponent={(itemProps) => (
				<Item item={itemProps.item}>
					{props.children
						? props.children(itemProps.item.rawValue)
						: itemProps.item.rawValue.label}
				</Item>
			)}
			sectionComponent={(sectionProps) => (
				<Section
					label={
						(sectionProps.section.rawValue as unknown as SelectOptionGroup)
							.label
					}
				/>
			)}
		>
			<Trigger aria-invalid={props["aria-invalid"]}>
				<SelectPrimitive.Value<SelectOption>>
					{(state) => {
						const selected = state.selectedOption();
						return (
							<span class={cn("flex-1 truncate", !selected && "text-ink-3")}>
								{selected
									? selected.label
									: (props.placeholder ?? "Select an option")}
							</span>
						);
					}}
				</SelectPrimitive.Value>
			</Trigger>
			<Content />
		</SelectPrimitive.Root>
	);
}

// ─── Exports ───

export type { SelectOption, SelectOptionGroup, SelectOptions, SelectProps };
export { Select };
