import * as MenuPrimitive from "@kobalte/core/context-menu";
import { Check, ChevronRight, Circle } from "lucide-solid";
import type { JSX } from "solid-js";
import { For, Match, Switch } from "solid-js";
import type {
	MenuAction,
	MenuCheckbox,
	MenuItem,
	MenuItems,
	MenuLabel,
	MenuRadioGroup,
	MenuSub,
} from "#components/dropdown-menu";
import { cn } from "#lib/cn";
import {
	isGroupedItems,
	menuContentClass,
	menuGroupLabelClass,
	menuItemClass,
	menuSeparatorClass,
	menuShortcutClass,
} from "#lib/menu";

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

// ─── ContextMenu (public) ───

type ContextMenuProps = {
	items: MenuItems;
	class?: string;
	contentClass?: string;
	children: JSX.Element;
};

function ContextMenu(props: ContextMenuProps) {
	return (
		<MenuPrimitive.Root gutter={4}>
			<MenuPrimitive.Trigger class={props.class}>
				{props.children}
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

export type { ContextMenuProps };
export { ContextMenu };
