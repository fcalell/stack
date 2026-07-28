import type { ButtonTone } from "@fcalell/ui-core/variants";
import * as SheetPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { VariantProps } from "class-variance-authority";
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
import {
	sheetOverlayClass,
	sheetPortalVariants,
	sheetVariants,
} from "#lib/sheet";

// ─── Portal (internal) ───

type PortalProps = SheetPrimitive.DialogPortalProps &
	VariantProps<typeof sheetPortalVariants>;

function Portal(props: PortalProps) {
	const [local, rest] = splitProps(props, ["position", "children"]);
	return (
		<SheetPrimitive.Portal {...rest}>
			<div class={sheetPortalVariants({ position: local.position })}>
				{local.children}
			</div>
		</SheetPrimitive.Portal>
	);
}

// ─── Overlay (internal) ───

function Overlay(props: SheetPrimitive.DialogOverlayProps) {
	return <SheetPrimitive.Overlay class={sheetOverlayClass} {...props} />;
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	SheetPrimitive.DialogContentProps<T> &
		VariantProps<typeof sheetVariants> & {
			children?: JSX.Element;
			class?: never;
			style?: never;
			classList?: never;
			hideCloseButton?: boolean;
		};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, [
		"position",
		"size",
		"children",
		"hideCloseButton",
	]);
	return (
		<Portal position={local.position}>
			<Overlay />
			<SheetPrimitive.Content
				class={cn(
					sheetVariants({ position: local.position, size: local.size }),
					"max-h-screen overflow-y-auto",
				)}
				{...rest}
			>
				{local.children}
				<Show when={!local.hideCloseButton}>
					<SheetPrimitive.CloseButton class="absolute right-4 top-4 text-ink-3 transition-[color,background-color,border-color] duration-(--duration-base) ease-ui hover:text-ink-1 focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2 disabled:pointer-events-none">
						<X class="size-4" aria-hidden="true" />
						<span class="sr-only">Close</span>
					</SheetPrimitive.CloseButton>
				</Show>
			</SheetPrimitive.Content>
		</Portal>
	);
}

// ─── Trigger / Close ───

type TriggerProps<T extends ValidComponent = "button"> =
	SheetPrimitive.DialogTriggerProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	return (
		<SheetPrimitive.Trigger {...(props as SheetPrimitive.DialogTriggerProps)} />
	);
}

type CloseProps<T extends ValidComponent = "button"> =
	SheetPrimitive.DialogCloseButtonProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Close<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, CloseProps<T>>,
) {
	return (
		<SheetPrimitive.CloseButton
			{...(props as SheetPrimitive.DialogCloseButtonProps)}
		/>
	);
}

// ─── Header / Footer ───

function Header(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return <div class="flex flex-col space-y-2 text-left" {...props} />;
}

function Footer(
	props: ComponentProps<"div"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<div
			class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
			{...props}
		/>
	);
}

// ─── Title / Description ───

type TitleProps<T extends ValidComponent = "h2"> =
	SheetPrimitive.DialogTitleProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TitleProps<T>>,
) {
	return (
		<SheetPrimitive.Title class="text-h3 font-semibold text-ink-1" {...props} />
	);
}

type DescriptionProps<T extends ValidComponent = "p"> =
	SheetPrimitive.DialogDescriptionProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, DescriptionProps<T>>,
) {
	return (
		<SheetPrimitive.Description class="text-callout text-ink-3" {...props} />
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
	tone?: ButtonTone;
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
					<Button emphasis="secondary" onClick={() => close(false)}>
						{props.cancelLabel ?? "Cancel"}
					</Button>
					<Button tone={props.tone} onClick={() => close(true)}>
						{props.confirmLabel ?? "Confirm"}
					</Button>
				</Footer>
			</>
		);
	}, options);
}

// ─── Exports ───

export const Sheet = Object.assign(SheetPrimitive.Root, {
	Trigger,
	Close,
	Content,
	Header,
	Footer,
	Title,
	Description,
	Provider: SheetProvider,
});

export type { ConfirmSheetProps, CreateSheetOptions };
export { createConfirmSheet, createSheet };
