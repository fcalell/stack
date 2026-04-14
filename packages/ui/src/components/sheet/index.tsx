import * as SheetPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { For, Show, splitProps } from "solid-js";
import { Button } from "#components/button";
import { cn } from "#lib/cn";
import {
	createOverlayContext,
	createOverlayHook,
	createProviderState,
} from "#lib/overlay";

// ─── Portal (internal) ───

const portalVariants = cva("fixed inset-0 z-50 flex", {
	variants: {
		position: {
			top: "items-start",
			bottom: "items-end",
			left: "justify-start",
			right: "justify-end",
		},
	},
	defaultVariants: { position: "right" },
});

type PortalProps = SheetPrimitive.DialogPortalProps &
	VariantProps<typeof portalVariants>;

function Portal(props: PortalProps) {
	const [local, rest] = splitProps(props, ["position", "children"]);
	return (
		<SheetPrimitive.Portal {...rest}>
			<div class={portalVariants({ position: local.position })}>
				{local.children}
			</div>
		</SheetPrimitive.Portal>
	);
}

// ─── Overlay (internal) ───

type OverlayProps<T extends ValidComponent = "div"> =
	SheetPrimitive.DialogOverlayProps<T> & { class?: string };

function Overlay<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, OverlayProps<T>>,
) {
	const [local, rest] = splitProps(props as OverlayProps, ["class"]);
	return (
		<SheetPrimitive.Overlay
			class={cn(
				"fixed inset-0 z-50 bg-background/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Content ───

const sheetVariants = cva(
	"fixed z-50 gap-4 bg-background p-6 transition duration-200 ease-ui data-[expanded]:animate-in data-[closed]:animate-out",
	{
		variants: {
			position: {
				top: "inset-x-0 top-0 border-b data-[closed]:slide-out-to-top data-[expanded]:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 border-t data-[closed]:slide-out-to-bottom data-[expanded]:slide-in-from-bottom",
				left: "inset-y-0 left-0 h-full w-3/4 border-r data-[closed]:slide-out-to-left data-[expanded]:slide-in-from-left",
				right:
					"inset-y-0 right-0 h-full w-3/4 border-l data-[closed]:slide-out-to-right data-[expanded]:slide-in-from-right",
			},
			size: {
				sm: "sm:max-w-sm",
				md: "sm:max-w-md",
				lg: "sm:max-w-lg",
				xl: "sm:max-w-xl",
				full: "max-w-none",
			},
		},
		defaultVariants: {
			position: "right",
			size: "sm",
		},
	},
);

type ContentProps<T extends ValidComponent = "div"> =
	SheetPrimitive.DialogContentProps<T> &
		VariantProps<typeof sheetVariants> & {
			class?: string;
			children?: JSX.Element;
		};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, [
		"position",
		"size",
		"class",
		"children",
	]);
	return (
		<Portal position={local.position}>
			<Overlay />
			<SheetPrimitive.Content
				class={cn(
					sheetVariants({ position: local.position, size: local.size }),
					"max-h-screen overflow-y-auto",
					local.class,
				)}
				{...rest}
			>
				{local.children}
				<SheetPrimitive.CloseButton class="absolute right-4 top-4 text-muted-foreground transition-[color,background-color,border-color] duration-base ease-ui hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none">
					<X class="size-4" aria-hidden="true" />
					<span class="sr-only">Close</span>
				</SheetPrimitive.CloseButton>
			</SheetPrimitive.Content>
		</Portal>
	);
}

// ─── Header / Footer ───

function Header(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn("flex flex-col space-y-2 text-left", local.class)}
			{...rest}
		/>
	);
}

function Footer(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn(
				"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Title / Description ───

type TitleProps<T extends ValidComponent = "h2"> =
	SheetPrimitive.DialogTitleProps<T> & { class?: string };

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TitleProps<T>>,
) {
	const [local, rest] = splitProps(props as TitleProps, ["class"]);
	return (
		<SheetPrimitive.Title
			class={cn("text-lg font-semibold text-foreground", local.class)}
			{...rest}
		/>
	);
}

type DescriptionProps<T extends ValidComponent = "p"> =
	SheetPrimitive.DialogDescriptionProps<T> & { class?: string };

function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, DescriptionProps<T>>,
) {
	const [local, rest] = splitProps(props as DescriptionProps, ["class"]);
	return (
		<SheetPrimitive.Description
			class={cn("text-sm text-muted-foreground", local.class)}
			{...rest}
		/>
	);
}

// ─── SheetProvider ───

const { Context: SheetContext, useCtx: useSheetCtx } =
	createOverlayContext("Sheet");

function SheetProvider(props: { children: JSX.Element }) {
	const { entries, context } = createProviderState();

	return (
		<SheetContext.Provider value={context}>
			{props.children}
			<For each={entries()}>{(entry) => entry.component()}</For>
		</SheetContext.Provider>
	);
}

// ─── createSheet ───

type CreateSheetOptions = {
	position?: "top" | "bottom" | "left" | "right";
	size?: "sm" | "md" | "lg" | "xl" | "full";
	contentClass?: string;
	sheetProps?: Partial<{ preventScroll: boolean; modal: boolean }>;
};

function createSheet<P = void, R = undefined>(
	render: (props: P, close: (result?: R) => void) => JSX.Element,
	options?: CreateSheetOptions,
): { open: (props: P) => Promise<R | undefined> } {
	const ctx = useSheetCtx();

	return createOverlayHook<P, R>(ctx, (s) => (
		<SheetPrimitive.Root
			open={s.isOpen()}
			onOpenChange={s.handleOpenChange}
			{...options?.sheetProps}
		>
			<Show when={s.state()} keyed>
				{(current) => (
					<Content
						position={options?.position ?? "right"}
						size={options?.size ?? "sm"}
						class={options?.contentClass}
					>
						{render(current.props, s.close)}
					</Content>
				)}
			</Show>
		</SheetPrimitive.Root>
	));
}

// ─── createConfirmSheet ───

type ConfirmSheetProps = {
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
};

function createConfirmSheet(options?: CreateSheetOptions) {
	return createSheet<ConfirmSheetProps, boolean>((props, close) => {
		return (
			<>
				<Header>
					<Title>{props.title}</Title>
				</Header>
				<Description>{props.description}</Description>
				<Footer>
					<Button variant="secondary" onClick={() => close(false)}>
						{props.cancelLabel ?? "Cancel"}
					</Button>
					<Button
						variant={props.variant ?? "default"}
						onClick={() => close(true)}
					>
						{props.confirmLabel ?? "Confirm"}
					</Button>
				</Footer>
			</>
		);
	}, options);
}

// ─── Exports ───

export const Sheet = Object.assign(SheetPrimitive.Root, {
	Trigger: SheetPrimitive.Trigger,
	Close: SheetPrimitive.CloseButton,
	Content,
	Header,
	Footer,
	Title,
	Description,
	Provider: SheetProvider,
});

export type { ConfirmSheetProps, CreateSheetOptions };
export { createConfirmSheet, createSheet };
