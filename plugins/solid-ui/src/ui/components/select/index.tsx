import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown } from "lucide-solid";
import type { JSX, ValidComponent } from "solid-js";
import { createMemo, splitProps } from "solid-js";
import { cn } from "#lib/cn";

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

const selectTriggerVariants = cva(
	"flex w-full flex-row items-center justify-between gap-2 rounded-md border-2 border-input bg-muted font-mono text-sm text-foreground outline-none transition-all select-none text-left focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-destructive aria-invalid:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			size: {
				sm: "h-8 px-3 py-1 text-sm",
				default: "h-10 px-4 py-2 text-sm",
				lg: "h-12 px-4 py-3 text-base",
			},
		},
		defaultVariants: { size: "default" },
	},
);

type TriggerProps<T extends ValidComponent = "button"> =
	SelectPrimitive.SelectTriggerProps<T> &
		VariantProps<typeof selectTriggerVariants> & {
			class?: string;
			children?: JSX.Element;
		};

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	const [local, rest] = splitProps(props as TriggerProps, [
		"class",
		"size",
		"children",
	]);
	return (
		<SelectPrimitive.Trigger
			class={cn(selectTriggerVariants({ size: local.size }), local.class)}
			{...rest}
		>
			{local.children}
			<SelectPrimitive.Icon>
				<ChevronDown
					class="size-4 shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

// ─── Content (internal) ───

function Content(props: { class?: string }) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				class={cn(
					"z-50 overflow-hidden rounded-md border-2 border-border bg-popover text-popover-foreground outline-none origin-[var(--kb-select-content-transform-origin)] animate-content-hide data-[expanded]:animate-content-show",
					props.class,
				)}
			>
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
			class="relative flex w-full cursor-default flex-row items-center gap-2 px-4 py-2 text-sm outline-none transition-colors select-none hover:bg-muted data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50"
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
			<SelectPrimitive.Label class="px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
	size?: "sm" | "default" | "lg";
	class?: string;
	contentClass?: string;
	"aria-invalid"?: boolean;
	disallowEmptySelection?: boolean;
	children?: (option: SelectOption) => JSX.Element;
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
			<Trigger
				size={props.size}
				class={props.class}
				aria-invalid={props["aria-invalid"]}
			>
				<SelectPrimitive.Value<SelectOption>>
					{(state) => {
						const selected = state.selectedOption();
						return (
							<span
								class={`flex-1 truncate ${!selected ? "text-muted-foreground" : ""}`}
							>
								{selected
									? selected.label
									: (props.placeholder ?? "Select an option")}
							</span>
						);
					}}
				</SelectPrimitive.Value>
			</Trigger>
			<Content class={props.contentClass} />
		</SelectPrimitive.Root>
	);
}

// ─── Exports ───

export type { SelectOption, SelectOptionGroup, SelectOptions, SelectProps };
export { Select, selectTriggerVariants };
