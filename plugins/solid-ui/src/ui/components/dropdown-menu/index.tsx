import * as MenuPrimitive from "@kobalte/core/dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-solid";
import type { JSX } from "solid-js";
import { For, Match, Switch } from "solid-js";
import { cn } from "#lib/cn";
import {
	isGroupedItems,
	menuContentClass,
	menuGroupLabelClass,
	menuItemClass,
	menuSeparatorClass,
	menuShortcutClass,
} from "#lib/menu";

// ─── Item types ───

type MenuAction = {
	type?: never;
	label: string;
	icon?: JSX.Element;
	onSelect?: () => void;
	disabled?: boolean;
	shortcut?: string;
};

type MenuCheckbox = {
	type: "checkbox";
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
};

type MenuRadioGroup = {
	type: "radio";
	value: string;
	onValueChange: (value: string) => void;
	items: { value: string; label: string; disabled?: boolean }[];
};

type MenuSub = {
	type: "sub";
	label: string;
	icon?: JSX.Element;
	items: MenuItem[];
};

type MenuSeparator = { type: "separator" };
type MenuLabel = { type: "label"; label: string };

type MenuItem =
	| MenuAction
	| MenuCheckbox
	| MenuRadioGroup
	| MenuSub
	| MenuSeparator
	| MenuLabel;

type MenuGroup = {
	label: string;
	items: MenuItem[];
};

type MenuItems = MenuItem[] | MenuGroup[];

// ─── Item renderers (internal) ───

function renderItem(item: MenuItem) {
	return (
		<Switch>
			<Match when={item.type === "separator"}>
				<MenuPrimitive.Separator class={menuSeparatorClass} />
			</Match>
			<Match when={item.type === "label"}>
				<div class={menuGroupLabelClass}>{(item as MenuLabel).label}</div>
			</Match>
			<Match when={item.type === "checkbox"}>
				{(() => {
					const cb = item as MenuCheckbox;
					return (
						<MenuPrimitive.CheckboxItem
							checked={cb.checked}
							onChange={cb.onCheckedChange}
							disabled={cb.disabled}
							class={cn(menuItemClass, "pl-8 pr-2")}
						>
							<span class="absolute left-2 flex size-3.5 items-center justify-center">
								<MenuPrimitive.ItemIndicator>
									<Check class="size-4" aria-hidden="true" />
								</MenuPrimitive.ItemIndicator>
							</span>
							{cb.label}
						</MenuPrimitive.CheckboxItem>
					);
				})()}
			</Match>
			<Match when={item.type === "radio"}>
				{(() => {
					const rg = item as MenuRadioGroup;
					return (
						<MenuPrimitive.RadioGroup
							value={rg.value}
							onChange={rg.onValueChange}
						>
							<For each={rg.items}>
								{(radio) => (
									<MenuPrimitive.RadioItem
										value={radio.value}
										disabled={radio.disabled}
										class={cn(menuItemClass, "cursor-pointer pl-8 pr-2")}
									>
										<span class="absolute left-2 flex size-3.5 items-center justify-center">
											<MenuPrimitive.ItemIndicator>
												<Circle
													class="size-2 fill-current"
													aria-hidden="true"
												/>
											</MenuPrimitive.ItemIndicator>
										</span>
										{radio.label}
									</MenuPrimitive.RadioItem>
								)}
							</For>
						</MenuPrimitive.RadioGroup>
					);
				})()}
			</Match>
			<Match when={item.type === "sub"}>
				{(() => {
					const sub = item as MenuSub;
					return (
						<MenuPrimitive.Sub gutter={2} shift={-5}>
							<MenuPrimitive.SubTrigger class={cn(menuItemClass, "gap-2")}>
								{sub.icon}
								{sub.label}
								<ChevronRight class="ml-auto size-4" aria-hidden="true" />
							</MenuPrimitive.SubTrigger>
							<MenuPrimitive.Portal>
								<MenuPrimitive.SubContent class={menuContentClass}>
									<For each={sub.items}>{(subItem) => renderItem(subItem)}</For>
								</MenuPrimitive.SubContent>
							</MenuPrimitive.Portal>
						</MenuPrimitive.Sub>
					);
				})()}
			</Match>
			<Match when={!item.type}>
				{(() => {
					const action = item as MenuAction;
					return (
						<MenuPrimitive.Item
							onSelect={action.onSelect}
							disabled={action.disabled}
							class={cn(menuItemClass, "gap-2")}
						>
							{action.icon}
							{action.label}
							{action.shortcut && (
								<kbd class={menuShortcutClass}>{action.shortcut}</kbd>
							)}
						</MenuPrimitive.Item>
					);
				})()}
			</Match>
		</Switch>
	);
}

function renderItems(items: MenuItems) {
	if (isGroupedItems(items)) {
		return (
			<For each={items}>
				{(group, gi) => (
					<>
						{gi() > 0 && <MenuPrimitive.Separator class={menuSeparatorClass} />}
						<MenuPrimitive.Group>
							<MenuPrimitive.GroupLabel class={menuGroupLabelClass}>
								{group.label}
							</MenuPrimitive.GroupLabel>
							<For each={group.items}>{(item) => renderItem(item)}</For>
						</MenuPrimitive.Group>
					</>
				)}
			</For>
		);
	}
	return <For each={items}>{(item) => renderItem(item)}</For>;
}

// ─── DropdownMenu (public) ───

type DropdownMenuProps = {
	trigger: JSX.Element;
	items: MenuItems;
	class?: string;
	contentClass?: string;
};

function DropdownMenu(props: DropdownMenuProps) {
	return (
		<MenuPrimitive.Root gutter={4}>
			<MenuPrimitive.Trigger as="div" class="inline-flex">
				{props.trigger}
			</MenuPrimitive.Trigger>
			<MenuPrimitive.Portal>
				<MenuPrimitive.Content class={cn(menuContentClass, props.contentClass)}>
					{renderItems(props.items)}
				</MenuPrimitive.Content>
			</MenuPrimitive.Portal>
		</MenuPrimitive.Root>
	);
}

// ─── Exports ───

export type {
	DropdownMenuProps,
	MenuAction,
	MenuCheckbox,
	MenuGroup,
	MenuItem,
	MenuItems,
	MenuLabel,
	MenuRadioGroup,
	MenuSeparator,
	MenuSub,
};
export { DropdownMenu };
