import type { ButtonTone } from "@fcalell/ui-core/variants";
import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { createSignal, createUniqueId, For, Show, splitProps } from "solid-js";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { Text } from "#components/text";
import {
	createOverlayContext,
	createOverlayHook,
	createProviderState,
} from "#lib/overlay";

// ─── Portal + Overlay (internal) ───

function Portal(props: DialogPrimitive.DialogPortalProps) {
	const [, rest] = splitProps(props, ["children"]);
	return (
		<DialogPrimitive.Portal {...rest}>
			<div class="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
				{props.children}
			</div>
		</DialogPrimitive.Portal>
	);
}

function Overlay(props: DialogPrimitive.DialogOverlayProps) {
	return (
		<DialogPrimitive.Overlay
			class="fixed inset-0 z-50 bg-scrim data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0"
			{...props}
		/>
	);
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	DialogPrimitive.DialogContentProps<T> & {
		children?: JSX.Element;
		class?: never;
		style?: never;
		classList?: never;
	};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, ["children"]);
	return (
		<Portal>
			<Overlay />
			<DialogPrimitive.Content
				class="relative z-50 grid max-h-screen w-full max-w-lg gap-4 overflow-y-auto rounded-xl border bg-canvas p-6 duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%]"
				{...rest}
			>
				{local.children}
				<DialogPrimitive.CloseButton class="absolute right-3 top-3 flex size-8 items-center justify-center text-ink-3 transition-[color,background-color,border-color] duration-(--duration-base) ease-ui hover:text-ink-1 focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2 disabled:pointer-events-none">
					<X class="size-4" aria-hidden="true" />
					<span class="sr-only">Close</span>
				</DialogPrimitive.CloseButton>
			</DialogPrimitive.Content>
		</Portal>
	);
}

// ─── Trigger ───

type TriggerProps<T extends ValidComponent = "button"> =
	DialogPrimitive.DialogTriggerProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	return (
		<DialogPrimitive.Trigger
			{...(props as DialogPrimitive.DialogTriggerProps)}
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
	return (
		<div
			class="flex flex-col space-y-1.5 text-center sm:text-left"
			{...props}
		/>
	);
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
	DialogPrimitive.DialogTitleProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TitleProps<T>>,
) {
	return <DialogPrimitive.Title class="text-h3 font-semibold" {...props} />;
}

type DescriptionProps<T extends ValidComponent = "p"> =
	DialogPrimitive.DialogDescriptionProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, DescriptionProps<T>>,
) {
	return (
		<DialogPrimitive.Description class="text-callout text-ink-3" {...props} />
	);
}

// ─── DialogProvider ───

const { Context: DialogContext, useCtx: useDialogCtx } =
	createOverlayContext("Dialog");

function DialogProvider(props: { children: JSX.Element }) {
	const { entries, context } = createProviderState();

	return (
		<DialogContext.Provider value={context}>
			{props.children}
			<For each={entries()}>{(entry) => entry.component()}</For>
		</DialogContext.Provider>
	);
}

// ─── createDialog ───

type CreateDialogOptions = {
	dialogProps?: Partial<{ preventScroll: boolean; modal: boolean }>;
};

function createDialog<P = void, R = undefined>(
	render: (props: P, close: (result?: R) => void) => JSX.Element,
	options?: CreateDialogOptions,
): { open: (props: P) => Promise<R | undefined> } {
	const ctx = useDialogCtx();

	return createOverlayHook<P, R>(ctx, (s) => (
		<DialogPrimitive.Root
			open={s.isOpen()}
			onOpenChange={s.handleOpenChange}
			{...options?.dialogProps}
		>
			<Show when={s.state()} keyed>
				{(current) => <Content>{render(current.props, s.close)}</Content>}
			</Show>
		</DialogPrimitive.Root>
	));
}

// ─── createConfirmDialog ───

type ConfirmDialogProps = {
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: ButtonTone;
};

function createConfirmDialog(options?: CreateDialogOptions) {
	return createDialog<ConfirmDialogProps, boolean>((props, close) => {
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

// ─── createConfirmByNameDialog ───

type ConfirmByNameProps = {
	name: string;
	title: string;
	description: string;
	actionLabel: string;
};

function createConfirmByNameDialog(options?: CreateDialogOptions) {
	return createDialog<ConfirmByNameProps, boolean>((props, close) => {
		const [value, setValue] = createSignal("");
		const matches = () => value() === props.name;
		const inputId = createUniqueId();

		return (
			<>
				<Header>
					<Title>{props.title}</Title>
				</Header>
				<Description>{props.description}</Description>
				<div class="flex flex-col gap-2">
					<Text as="label" variant="caption" tone="ink-3" for={inputId}>
						Type <span class="font-bold text-ink-1">{props.name}</span> to
						confirm
					</Text>
					<Input
						id={inputId}
						value={value()}
						onInput={(e) => setValue(e.currentTarget.value)}
						placeholder={props.name}
					/>
				</div>
				<Footer>
					<Button emphasis="secondary" onClick={() => close(undefined)}>
						Cancel
					</Button>
					<Button
						tone="danger"
						disabled={!matches()}
						onClick={() => close(true)}
					>
						{props.actionLabel}
					</Button>
				</Footer>
			</>
		);
	}, options);
}

// ─── Exports ───

export const Dialog = Object.assign(DialogPrimitive.Root, {
	Trigger,
	Content,
	Header,
	Footer,
	Title,
	Description,
	Provider: DialogProvider,
});

export type { ConfirmByNameProps, ConfirmDialogProps, CreateDialogOptions };
export { createConfirmByNameDialog, createConfirmDialog, createDialog };
