import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { createSignal, createUniqueId, For, Show, splitProps } from "solid-js";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { Text } from "#components/text";
import { cn } from "#lib/cn";
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

type OverlayProps<T extends ValidComponent = "div"> =
	DialogPrimitive.DialogOverlayProps<T> & { class?: string };

function Overlay<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, OverlayProps<T>>,
) {
	const [local, rest] = splitProps(props as OverlayProps, ["class"]);
	return (
		<DialogPrimitive.Overlay
			class={cn(
				"fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
				local.class,
			)}
			{...rest}
		/>
	);
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	DialogPrimitive.DialogContentProps<T> & {
		class?: string;
		children?: JSX.Element;
	};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, [
		"class",
		"children",
	]);
	return (
		<Portal>
			<Overlay />
			<DialogPrimitive.Content
				class={cn(
					"relative z-50 grid max-h-screen w-full max-w-lg gap-4 overflow-y-auto rounded-lg border bg-background p-6 duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%]",
					local.class,
				)}
				{...rest}
			>
				{local.children}
				<DialogPrimitive.CloseButton class="absolute right-3 top-3 flex size-8 items-center justify-center text-muted-foreground transition-[color,background-color,border-color] duration-base ease-ui hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none">
					<X class="size-4" aria-hidden="true" />
					<span class="sr-only">Close</span>
				</DialogPrimitive.CloseButton>
			</DialogPrimitive.Content>
		</Portal>
	);
}

// ─── Header / Footer ───

function Header(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn(
				"flex flex-col space-y-1.5 text-center sm:text-left",
				local.class,
			)}
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
	DialogPrimitive.DialogTitleProps<T> & { class?: string };

function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, TitleProps<T>>,
) {
	const [local, rest] = splitProps(props as TitleProps, ["class"]);
	return (
		<DialogPrimitive.Title
			class={cn(
				"text-lg font-semibold leading-none tracking-tight",
				local.class,
			)}
			{...rest}
		/>
	);
}

type DescriptionProps<T extends ValidComponent = "p"> =
	DialogPrimitive.DialogDescriptionProps<T> & { class?: string };

function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, DescriptionProps<T>>,
) {
	const [local, rest] = splitProps(props as DescriptionProps, ["class"]);
	return (
		<DialogPrimitive.Description
			class={cn("text-sm text-muted-foreground", local.class)}
			{...rest}
		/>
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
	contentClass?: string;
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
				{(current) => (
					<Content class={options?.contentClass}>
						{render(current.props, s.close)}
					</Content>
				)}
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
	variant?: "default" | "destructive";
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
					<Text.Muted as="label" for={inputId}>
						Type <span class="font-bold text-foreground">{props.name}</span> to
						confirm
					</Text.Muted>
					<Input
						id={inputId}
						value={value()}
						onInput={(e) => setValue(e.currentTarget.value)}
						placeholder={props.name}
					/>
				</div>
				<Footer>
					<Button variant="secondary" onClick={() => close(undefined)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
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
	Trigger: DialogPrimitive.Trigger,
	Content,
	Header,
	Footer,
	Title,
	Description,
	Provider: DialogProvider,
});

export type { ConfirmByNameProps, ConfirmDialogProps, CreateDialogOptions };
export { createConfirmByNameDialog, createConfirmDialog, createDialog };
