import * as MenuPrimitive from "@kobalte/core/dropdown-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronRight, Circle } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Root ───

function Root(props: MenuPrimitive.DropdownMenuRootProps) {
	return <MenuPrimitive.Root gutter={4} {...props} />;
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuContentProps<T> & { class?: string };

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, ["class"]);
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Content
				class={cn(
					"z-50 min-w-32 origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground animate-content-hide data-[expanded]:animate-content-show",
					local.class,
				)}
				{...rest}
			/>
		</MenuPrimitive.Portal>
	);
}

// ─── Item ───

type ItemProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuItemProps<T> & { class?: string };

function Item<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ItemProps<T>>,
) {
	const [local, rest] = splitProps(props as ItemProps, ["class"]);
	return (
		<MenuPrimitive.Item
			class={cn(
				"relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Shortcut ───

function Shortcut(props: ComponentProps<"span">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<span
			class={cn("ml-auto text-xs tracking-widest opacity-60", local.class)}
			{...rest}
		/>
	);
}

// ─── Label ───

function Label(props: ComponentProps<"div"> & { inset?: boolean }) {
	const [local, rest] = splitProps(props, ["class", "inset"]);
	return (
		<div
			class={cn(
				"px-2 py-1.5 text-sm font-semibold",
				local.inset && "pl-8",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Separator ───

type SeparatorProps<T extends ValidComponent = "hr"> =
	MenuPrimitive.DropdownMenuSeparatorProps<T> & { class?: string };

function MenuSeparator<T extends ValidComponent = "hr">(
	props: PolymorphicProps<T, SeparatorProps<T>>,
) {
	const [local, rest] = splitProps(props as SeparatorProps, ["class"]);
	return (
		<MenuPrimitive.Separator
			class={cn("-mx-1 my-1 h-px bg-muted", local.class)}
			{...rest}
		/>
	);
}

// ─── SubTrigger ───

type SubTriggerProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuSubTriggerProps<T> & {
		class?: string;
		children?: JSX.Element;
	};

function SubTrigger<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, SubTriggerProps<T>>,
) {
	const [local, rest] = splitProps(props as SubTriggerProps, [
		"class",
		"children",
	]);
	return (
		<MenuPrimitive.SubTrigger
			class={cn(
				"flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
				local.class,
			)}
			{...rest}
		>
			{local.children}
			<ChevronRight class="ml-auto size-4" aria-hidden="true" />
		</MenuPrimitive.SubTrigger>
	);
}

// ─── SubContent ───

type SubContentProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuSubContentProps<T> & { class?: string };

function SubContent<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, SubContentProps<T>>,
) {
	const [local, rest] = splitProps(props as SubContentProps, ["class"]);
	return (
		<MenuPrimitive.SubContent
			class={cn(
				"z-50 min-w-32 origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground animate-content-hide data-[expanded]:animate-content-show",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── CheckboxItem ───

type CheckboxItemProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuCheckboxItemProps<T> & {
		class?: string;
		children?: JSX.Element;
	};

function CheckboxItem<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, CheckboxItemProps<T>>,
) {
	const [local, rest] = splitProps(props as CheckboxItemProps, [
		"class",
		"children",
	]);
	return (
		<MenuPrimitive.CheckboxItem
			class={cn(
				"relative flex cursor-default items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...rest}
		>
			<span class="absolute left-2 flex size-3.5 items-center justify-center">
				<MenuPrimitive.ItemIndicator>
					<Check class="size-4" aria-hidden="true" />
				</MenuPrimitive.ItemIndicator>
			</span>
			{local.children}
		</MenuPrimitive.CheckboxItem>
	);
}

// ─── GroupLabel ───

type GroupLabelProps<T extends ValidComponent = "span"> =
	MenuPrimitive.DropdownMenuGroupLabelProps<T> & { class?: string };

function GroupLabel<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, GroupLabelProps<T>>,
) {
	const [local, rest] = splitProps(props as GroupLabelProps, ["class"]);
	return (
		<MenuPrimitive.GroupLabel
			class={cn("px-2 py-1.5 text-sm font-semibold", local.class)}
			{...rest}
		/>
	);
}

// ─── RadioItem ───

type RadioItemProps<T extends ValidComponent = "div"> =
	MenuPrimitive.DropdownMenuRadioItemProps<T> & {
		class?: string;
		children?: JSX.Element;
	};

function RadioItem<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, RadioItemProps<T>>,
) {
	const [local, rest] = splitProps(props as RadioItemProps, [
		"class",
		"children",
	]);
	return (
		<MenuPrimitive.RadioItem
			class={cn(
				"relative flex cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...rest}
		>
			<span class="absolute left-2 flex size-3.5 items-center justify-center">
				<MenuPrimitive.ItemIndicator>
					<Circle class="size-2 fill-current" aria-hidden="true" />
				</MenuPrimitive.ItemIndicator>
			</span>
			{local.children}
		</MenuPrimitive.RadioItem>
	);
}

// ─── Exports ───

export const DropdownMenu = Object.assign(Root, {
	Trigger: MenuPrimitive.Trigger,
	Portal: MenuPrimitive.Portal,
	Sub: MenuPrimitive.Sub,
	Group: MenuPrimitive.Group,
	RadioGroup: MenuPrimitive.RadioGroup,
	Content,
	Item,
	Shortcut,
	Label,
	Separator: MenuSeparator,
	SubTrigger,
	SubContent,
	CheckboxItem,
	GroupLabel,
	RadioItem,
});
