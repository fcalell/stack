import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown } from "lucide-solid";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Trigger ───

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
			class={selectTriggerVariants({
				size: local.size,
				className: local.class,
			})}
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

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	SelectPrimitive.SelectContentProps<T> & {
		class?: string;
	};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, ["class"]);
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				class={cn(
					"z-50 overflow-hidden rounded-md border-2 border-border bg-popover text-popover-foreground outline-none origin-[var(--kb-select-content-transform-origin)] animate-content-hide data-[expanded]:animate-content-show",
					local.class,
				)}
				{...rest}
			>
				<SelectPrimitive.Listbox class="max-h-60 overflow-x-hidden overflow-y-auto py-1" />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

// ─── Item ───

type ItemProps<T extends ValidComponent = "li"> =
	SelectPrimitive.SelectItemProps<T> & {
		class?: string;
		children?: JSX.Element;
	};

function Item<T extends ValidComponent = "li">(
	props: PolymorphicProps<T, ItemProps<T>>,
) {
	const [local, rest] = splitProps(props as ItemProps, ["class", "children"]);
	return (
		<SelectPrimitive.Item
			class={cn(
				"relative flex w-full cursor-default flex-row items-center gap-2 px-4 py-2 text-sm outline-none transition-colors select-none hover:bg-muted data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50",
				local.class,
			)}
			{...rest}
		>
			<SelectPrimitive.ItemLabel class="flex flex-1 flex-row items-center gap-2">
				<span class="flex-1">{local.children}</span>
			</SelectPrimitive.ItemLabel>
			<SelectPrimitive.ItemIndicator>
				<Check class="size-4 shrink-0 text-current" aria-hidden="true" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

// ─── Section ───

type SectionProps<T extends ValidComponent = "li"> =
	SelectPrimitive.SelectSectionProps<T> & {
		class?: string;
	};

function Section<T extends ValidComponent = "li">(
	props: PolymorphicProps<T, SectionProps<T>>,
) {
	const [local, rest] = splitProps(props as SectionProps, ["class"]);
	return (
		<SelectPrimitive.Section
			class={cn("mt-1 first:mt-0", local.class)}
			{...rest}
		/>
	);
}

// ─── SectionLabel ───

type SectionLabelProps<T extends ValidComponent = "span"> =
	SelectPrimitive.SelectLabelProps<T> & { class?: string };

function SectionLabel<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, SectionLabelProps<T>>,
) {
	const [local, rest] = splitProps(props as SectionLabelProps, ["class"]);
	return (
		<SelectPrimitive.Label
			class={cn(
				"px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Exports ───

const Select = Object.assign(SelectPrimitive.Root, {
	Trigger,
	Value: SelectPrimitive.Value,
	HiddenSelect: SelectPrimitive.HiddenSelect,
	Content,
	Item,
	Section,
	SectionLabel,
});

export type {
	ContentProps as SelectContentProps,
	ItemProps as SelectItemProps,
	SectionLabelProps as SelectSectionLabelProps,
	SectionProps as SelectSectionProps,
	TriggerProps as SelectTriggerProps,
};
export { Select, selectTriggerVariants };
