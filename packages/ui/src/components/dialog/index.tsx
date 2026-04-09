import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

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
				<DialogPrimitive.CloseButton class="absolute right-3 top-3 flex size-8 items-center justify-center text-muted-foreground transition-[color,background-color,border-color] duration-base ease-ui hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none">
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

// ─── Exports ───

export const Dialog = Object.assign(DialogPrimitive.Root, {
	Trigger: DialogPrimitive.Trigger,
	Content,
	Header,
	Footer,
	Title,
	Description,
});
