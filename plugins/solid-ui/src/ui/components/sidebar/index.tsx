import * as SheetPrimitive from "@kobalte/core/dialog";
import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-solid";
import type { Accessor, ComponentProps, ValidComponent } from "solid-js";
import {
	createContext,
	createEffect,
	createSignal,
	Match,
	mergeProps,
	onCleanup,
	Show,
	Switch,
	splitProps,
	useContext,
} from "solid-js";
import { Input } from "#components/input";
import { Loader } from "#components/loader";
import { Tooltip } from "#components/tooltip";
import { cn } from "#lib/cn";
import { separatorClass } from "#lib/separator";
import {
	sheetOverlayClass,
	sheetPortalVariants,
	sheetVariants,
} from "#lib/sheet";

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextType = {
	state: Accessor<"expanded" | "collapsed">;
	open: Accessor<boolean>;
	setOpen: (open: boolean) => void;
	openMobile: Accessor<boolean>;
	setOpenMobile: (open: boolean) => void;
	isMobile: Accessor<boolean>;
	toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

function useSidebar() {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a Sidebar.");
	}
	return context;
}

function useIsMobile(fallback = false) {
	const [isMobile, setIsMobile] = createSignal(fallback);

	createEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
			setIsMobile(e.matches);
		};
		mql.addEventListener("change", onChange);
		onChange(mql);
		onCleanup(() => mql.removeEventListener("change", onChange));
	});

	return isMobile;
}

// ─── Provider ───

type ProviderProps = ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	class?: never;
	style?: never;
	classList?: never;
};

function Provider(rawProps: ProviderProps) {
	const props = mergeProps({ defaultOpen: true }, rawProps);
	const [local, others] = splitProps(props, [
		"defaultOpen",
		"open",
		"onOpenChange",
		"children",
	]);

	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = createSignal(false);
	const [_open, _setOpen] = createSignal(local.defaultOpen);
	const open = () => local.open ?? _open();
	const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
		if (local.onOpenChange) {
			return local.onOpenChange?.(
				typeof value === "function" ? value(open()) : value,
			);
		}
		_setOpen(value);
	};

	const toggleSidebar = () => {
		return isMobile() ? setOpenMobile((o) => !o) : setOpen((o) => !o);
	};

	createEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault();
				toggleSidebar();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
	});

	const state = () => (open() ? "expanded" : "collapsed");

	return (
		<SidebarContext.Provider
			value={{
				state,
				open,
				setOpen,
				isMobile,
				openMobile,
				setOpenMobile,
				toggleSidebar,
			}}
		>
			<div
				style={{
					"--sidebar-width": SIDEBAR_WIDTH,
					"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
				}}
				class="group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-surface"
				{...others}
			>
				{local.children}
			</div>
		</SidebarContext.Provider>
	);
}

// ─── Root ───

type SidebarRootProps = ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
	class?: never;
	style?: never;
	classList?: never;
};

function Root(rawProps: SidebarRootProps) {
	const props = mergeProps<SidebarRootProps[]>(
		{ side: "left", variant: "sidebar", collapsible: "offcanvas" },
		rawProps,
	);
	const [local, others] = splitProps(props, [
		"side",
		"variant",
		"collapsible",
		"children",
	]);

	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	return (
		<Switch>
			<Match when={local.collapsible === "none"}>
				<div
					class="w-(--sidebar-width) flex h-full flex-col bg-surface"
					{...others}
				>
					{local.children}
				</div>
			</Match>
			<Match when={isMobile()}>
				{/* The sheet look composed from Kobalte's primitives directly: the
				    closure leaves Sheet.Content no class to take, and the shared
				    strings live in lib/sheet. */}
				<SheetPrimitive.Root open={openMobile()} onOpenChange={setOpenMobile}>
					<SheetPrimitive.Portal>
						<div class={sheetPortalVariants({ position: local.side })}>
							<SheetPrimitive.Overlay class={sheetOverlayClass} />
							<SheetPrimitive.Content
								data-slot="sidebar"
								data-mobile="true"
								class={cn(
									sheetVariants({ position: local.side }),
									"max-h-screen overflow-y-auto",
									"w-(--sidebar-width) bg-surface p-0",
								)}
								style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
							>
								<div class="flex size-full flex-col">{local.children}</div>
							</SheetPrimitive.Content>
						</div>
					</SheetPrimitive.Portal>
				</SheetPrimitive.Root>
			</Match>
			<Match when={!isMobile()}>
				<div
					class="group peer hidden md:block"
					data-state={state()}
					data-collapsible={state() === "collapsed" ? local.collapsible : ""}
					data-variant={local.variant}
					data-side={local.side}
				>
					<div
						class={cn(
							"w-(--sidebar-width) relative h-svh bg-transparent transition-[width] duration-200 ease-linear",
							"group-data-[collapsible=offcanvas]:w-0",
							"group-data-[side=right]:rotate-180",
							local.variant === "floating" || local.variant === "inset"
								? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
								: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
						)}
					/>
					<div
						class={cn(
							"w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-svh transition-[transform,width] duration-200 ease-linear md:flex",
							local.side === "left"
								? "left-0 group-data-[collapsible=offcanvas]:-translate-x-full"
								: "right-0 group-data-[collapsible=offcanvas]:translate-x-full",
							local.variant === "floating" || local.variant === "inset"
								? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
								: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
						)}
						{...others}
					>
						<div
							data-slot="sidebar"
							class="flex size-full flex-col bg-surface group-data-[variant=floating]:border group-data-[variant=floating]:border-edge"
						>
							{local.children}
						</div>
					</div>
				</div>
			</Match>
		</Switch>
	);
}

// ─── Trigger ───

type TriggerProps = {
	onClick?: (event: MouseEvent) => void;
	class?: never;
	style?: never;
	classList?: never;
};

// A raw internal button rather than `Button`: inheriting ButtonProps was the
// one place a component's class prop leaked out through another's public type.
function Trigger(props: TriggerProps) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			type="button"
			class="flex aspect-square min-h-11 cursor-pointer items-center justify-center rounded-control text-ink-1 transition-[color,background-color] duration-(--duration-fast) ease-ui hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive"
			onClick={(event: MouseEvent) => {
				props.onClick?.(event);
				toggleSidebar();
			}}
		>
			<PanelLeft class="size-4" aria-hidden="true" />
			<span class="sr-only">Toggle Sidebar</span>
		</button>
	);
}

// ─── Rail ───

function Rail(
	props: ComponentProps<"button"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			aria-label="Toggle Sidebar"
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			class={cn(
				"absolute inset-y-0 z-20 hidden w-11 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-edge group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-surface",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
			)}
			{...props}
		/>
	);
}

// ─── Inset ───

function SidebarInset(
	props: ComponentProps<"main"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<main
			class={cn(
				"relative flex min-h-svh flex-1 flex-col bg-canvas",
				"peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0",
			)}
			{...props}
		/>
	);
}

// ─── Simple layout parts ───

function SidebarHeader(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex flex-col gap-2 p-2" {...props} />;
}

function SidebarFooter(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex flex-col gap-2 p-2" {...props} />;
}

function SidebarSeparator(
	props: ComponentProps<"hr"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <hr class={cn(separatorClass, "mx-2 w-auto")} {...props} />;
}

function SidebarContent(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
			{...props}
		/>
	);
}

function SidebarInput(props: ComponentProps<typeof Input>) {
	return <Input {...props} />;
}

// ─── Group ───

function Group(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="relative flex w-full min-w-0 flex-col p-2" {...props} />;
}

function GroupLabel<T extends ValidComponent = "div">(
	props: PolymorphicProps<
		T,
		{ class?: never; style?: never; classList?: never }
	>,
) {
	return (
		<Polymorphic
			as="div"
			class={cn(
				"flex h-8 shrink-0 items-center px-2 text-micro font-medium text-ink-3 outline-none transition-[margin,opacity] duration-200 ease-linear focus-visible:outline-2 focus-visible:outline-interactive [&>svg]:size-4 [&>svg]:shrink-0",
				"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
			)}
			{...props}
		/>
	);
}

function GroupAction<T extends ValidComponent = "button">(
	props: PolymorphicProps<
		T,
		{ class?: never; style?: never; classList?: never }
	>,
) {
	return (
		<Polymorphic
			as="button"
			class={cn(
				"absolute right-3 top-3.5 flex aspect-square w-6 items-center justify-center p-0 text-ink-1 outline-none transition-transform hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-interactive [&>svg]:size-4 [&>svg]:shrink-0",
				"after:absolute after:-inset-2 after:md:hidden",
				"group-data-[collapsible=icon]:hidden",
			)}
			{...props}
		/>
	);
}

function GroupContent(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="w-full text-callout" {...props} />;
}

// ─── Menu ───

function Menu(
	props: ComponentProps<"ul"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <ul class="flex w-full min-w-0 flex-col gap-1" {...props} />;
}

function MenuItem(
	props: ComponentProps<"li"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <li class="group/menu-item relative" {...props} />;
}

const menuButtonVariants = cva(
	"peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-control p-2 text-left text-callout outline-none transition-[width,height,padding] hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-interactive active:bg-surface-2 disabled:pointer-events-none disabled:opacity-50 group-has-data-[slot=sidebar-menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-interactive-soft data-[active=true]:font-medium data-[active=true]:text-interactive data-[state=open]:hover:bg-surface-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "hover:bg-surface-2",
				outline:
					"bg-canvas ring-1 ring-edge hover:bg-surface-2 hover:ring-edge-2",
			},
			size: {
				default: "h-8 text-callout",
				sm: "h-7 text-micro",
				lg: "h-12 text-callout group-data-[collapsible=icon]:p-0!",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type MenuButtonProps<T extends ValidComponent = "button"> = ComponentProps<T> &
	VariantProps<typeof menuButtonVariants> & {
		isActive?: boolean;
		tooltip?: string;
		class?: never;
		style?: never;
		classList?: never;
	};

function MenuButton<T extends ValidComponent = "button">(
	rawProps: PolymorphicProps<T, MenuButtonProps<T>>,
) {
	const props = mergeProps(
		{ isActive: false, variant: "default", size: "default" },
		rawProps,
	);
	const [local, others] = splitProps(props as MenuButtonProps, [
		"isActive",
		"tooltip",
		"variant",
		"size",
	]);
	const { isMobile, state } = useSidebar();

	const button = (
		<Polymorphic
			as="button"
			data-slot="sidebar-menu-button"
			data-size={local.size}
			data-active={local.isActive}
			class={menuButtonVariants({ variant: local.variant, size: local.size })}
			{...others}
		/>
	);

	return (
		<Show
			when={local.tooltip && state() === "collapsed" && !isMobile()}
			fallback={button}
		>
			<Tooltip placement="top">
				<TooltipPrimitive.Trigger as="div" class="inline-flex">
					{button}
				</TooltipPrimitive.Trigger>
				<Tooltip.Content>{local.tooltip}</Tooltip.Content>
			</Tooltip>
		</Show>
	);
}

type MenuActionProps<T extends ValidComponent = "button"> =
	ComponentProps<T> & {
		showOnHover?: boolean;
		class?: never;
		style?: never;
		classList?: never;
	};

function MenuAction<T extends ValidComponent = "button">(
	rawProps: PolymorphicProps<T, MenuActionProps<T>>,
) {
	const props = mergeProps({ showOnHover: false }, rawProps);
	const [local, others] = splitProps(props as MenuActionProps, ["showOnHover"]);

	return (
		<Polymorphic
			as="button"
			data-slot="sidebar-menu-action"
			class={cn(
				"absolute right-1 top-1.5 flex aspect-square w-6 items-center justify-center rounded-md p-0 text-ink-1 outline-none transition-transform hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-interactive peer-hover/menu-button:text-ink-1 [&>svg]:size-4 [&>svg]:shrink-0",
				"after:absolute after:-inset-2 after:md:hidden",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				local.showOnHover &&
					"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-interactive md:opacity-0",
			)}
			{...others}
		/>
	);
}

function MenuBadge(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			class={cn(
				"pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center px-1 text-micro font-medium tabular-nums text-ink-1 select-none",
				"peer-hover/menu-button:text-ink-1 peer-data-[active=true]/menu-button:text-interactive",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
			)}
			{...props}
		/>
	);
}

type MenuLoaderProps = ComponentProps<"div"> & {
	text?: string;
	class?: never;
	style?: never;
	classList?: never;
};

function MenuLoader(rawProps: MenuLoaderProps) {
	const props = mergeProps({ text: "loading..." }, rawProps);
	const [local, others] = splitProps(props, ["text"]);
	return (
		<div class="flex h-8 items-center gap-2 px-2" {...others}>
			<Loader text={local.text} />
		</div>
	);
}

function MenuSub(
	props: ComponentProps<"ul"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<ul
			class={cn(
				"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-edge px-2.5 py-0.5",
				"group-data-[collapsible=icon]:hidden",
			)}
			{...props}
		/>
	);
}

function MenuSubItem(
	props: ComponentProps<"li"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <li {...props} />;
}

type MenuSubButtonProps<T extends ValidComponent = "a"> = ComponentProps<T> & {
	size?: "sm" | "md";
	isActive?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

function MenuSubButton<T extends ValidComponent = "a">(
	rawProps: PolymorphicProps<T, MenuSubButtonProps<T>>,
) {
	const props = mergeProps({ size: "md" }, rawProps);
	const [local, others] = splitProps(props as MenuSubButtonProps, [
		"size",
		"isActive",
	]);

	return (
		<Polymorphic
			as="a"
			data-slot="sidebar-menu-sub-button"
			data-size={local.size}
			data-active={local.isActive}
			class={cn(
				"flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-control px-2 text-ink-1 outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-interactive active:bg-surface-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-ink-3",
				"data-[active=true]:bg-interactive-soft data-[active=true]:text-interactive",
				local.size === "sm" && "text-micro",
				local.size === "md" && "text-callout",
				"group-data-[collapsible=icon]:hidden",
			)}
			{...others}
		/>
	);
}

// ─── Exports ───

export const Sidebar = Object.assign(Root, {
	Provider,
	Trigger,
	Rail,
	Inset: SidebarInset,
	Header: SidebarHeader,
	Footer: SidebarFooter,
	Separator: SidebarSeparator,
	Content: SidebarContent,
	Input: SidebarInput,
	Group,
	GroupLabel,
	GroupAction,
	GroupContent,
	Menu,
	MenuItem,
	MenuButton,
	MenuAction,
	MenuBadge,
	MenuLoader,
	MenuSub,
	MenuSubItem,
	MenuSubButton,
});

export { menuButtonVariants, useIsMobile, useSidebar };
