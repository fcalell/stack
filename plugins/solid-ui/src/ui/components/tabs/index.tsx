import * as TabsPrimitive from "@kobalte/core/tabs";
import type { JSX } from "solid-js";
import { For, splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Tab types ───

type Tab = {
	value: string;
	label: string;
	content: JSX.Element;
	disabled?: boolean;
};

// ─── List (internal) ───

function List(props: { class?: string; children: JSX.Element }) {
	return (
		<TabsPrimitive.List
			class={cn(
				"relative inline-flex h-10 items-center justify-center rounded-control bg-surface-2 p-1 text-ink-3",
				props.class,
			)}
		>
			{props.children}
		</TabsPrimitive.List>
	);
}

// ─── Trigger (internal) ───

function Trigger(props: {
	value: string;
	disabled?: boolean;
	children: JSX.Element;
}) {
	return (
		<TabsPrimitive.Trigger
			value={props.value}
			disabled={props.disabled}
			class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-callout font-medium transition-colors duration-(--duration-base) ease-ui focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:bg-canvas data-selected:text-ink-1"
		>
			{props.children}
		</TabsPrimitive.Trigger>
	);
}

// ─── Content (internal) ───

function Content(props: {
	value: string;
	class?: string;
	children: JSX.Element;
}) {
	return (
		<TabsPrimitive.Content
			value={props.value}
			class={cn(
				"mt-0 focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2",
				props.class,
			)}
		>
			{props.children}
		</TabsPrimitive.Content>
	);
}

// ─── Indicator (internal) ───

function Indicator() {
	return (
		// Kobalte positions via translateX/translateY + width/height only, so the
		// indicator must be anchored at the list's origin: inline-start for the
		// horizontal translateX (start-0, matching Kobalte's RTL offset math) and
		// top for the vertical translateY.
		<TabsPrimitive.Indicator class="absolute bg-accent transition-all duration-250 data-[orientation=horizontal]:start-0 data-[orientation=horizontal]:-bottom-px data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:top-0 data-[orientation=vertical]:-right-px data-[orientation=vertical]:w-0.5" />
	);
}

// ─── Tabs (public) ───

type TabsProps = {
	tabs: Tab[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	orientation?: "horizontal" | "vertical";
	class?: string;
	listClass?: string;
	contentClass?: string;
	children?: (tab: Tab) => JSX.Element;
};

function Tabs(props: TabsProps) {
	const [local, rest] = splitProps(props, [
		"tabs",
		"class",
		"listClass",
		"contentClass",
		"children",
		"onValueChange",
	]);

	return (
		<TabsPrimitive.Root
			class={local.class}
			onChange={local.onValueChange}
			{...rest}
		>
			<List class={local.listClass}>
				<For each={local.tabs}>
					{(tab) => (
						<Trigger value={tab.value} disabled={tab.disabled}>
							{local.children ? local.children(tab) : tab.label}
						</Trigger>
					)}
				</For>
				<Indicator />
			</List>
			<For each={local.tabs}>
				{(tab) => (
					<Content value={tab.value} class={local.contentClass}>
						{tab.content}
					</Content>
				)}
			</For>
		</TabsPrimitive.Root>
	);
}

// ─── Exports ───

export type { Tab, TabsProps };
export { Tabs };
