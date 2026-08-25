import type { ButtonEmphasis, ButtonTone } from "@fcalell/ui-core/variants";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { Textarea } from "#components/textarea";
import {
	type GroupButtonSize,
	GroupButtonSizeContext,
	InputGroupContext,
} from "#lib/input-group";

// ─── Root ───

type RootProps = ComponentProps<"fieldset"> & {
	legend?: string;
	class?: never;
	style?: never;
	classList?: never;
};

function Root(props: RootProps) {
	const [local, rest] = splitProps(props, ["legend"]);
	return (
		<InputGroupContext.Provider value={true}>
			<fieldset
				data-slot="input-group"
				aria-label={local.legend}
				// The group is the field surface its borderless Input sits inside, so
				// it carries that control's 48px floor. A pinned height would lose to
				// the child's own `min-h` and render as dead weight, which is why the
				// `h-auto` escapes that used to undo it are gone too.
				class="relative flex min-h-12 w-full min-w-0 items-center rounded-control border-2 border-edge bg-surface-2 outline-none transition-colors has-[[data-slot=input-group-control]:focus-visible]:border-ink-1 has-[[data-slot][aria-invalid=true]]:border-danger has-disabled:bg-surface has-disabled:opacity-[0.38] has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5 in-data-[slot=combobox-content]:focus-within:border-inherit"
				{...rest}
			/>
		</InputGroupContext.Provider>
	);
}

// ─── Addon ───

const addonClasses = cva(
	"flex h-auto cursor-text flex-row items-center justify-center gap-2 py-2 text-micro font-medium text-ink-3 select-none group-data-[disabled=true]/input-group:opacity-50 [&:not(:has(>button))]:cursor-text [&>kbd]:rounded-none [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				"inline-start":
					"order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
				"inline-end":
					"order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
				"block-start":
					"order-first w-full justify-start px-3 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
				"block-end":
					"order-last w-full justify-start px-3 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
			},
		},
		defaultVariants: {
			align: "inline-start",
		},
	},
);

type AddonProps = ComponentProps<"div"> &
	VariantProps<typeof addonClasses> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Addon(props: AddonProps) {
	const merged = mergeProps({ align: "inline-start" as const }, props);
	const [local, rest] = splitProps(merged, ["align"]);
	return (
		<div
			data-slot="input-group-addon"
			data-align={local.align}
			class={addonClasses({ align: local.align })}
			{...rest}
		/>
	);
}

// ─── GroupButton ───

// The compact size reaches `Button` through the context, and the button
// composes its own in-group overlay from it.
type GroupButtonProps = Omit<ComponentProps<"button">, "size"> & {
	size?: GroupButtonSize;
	emphasis?: ButtonEmphasis;
	tone?: ButtonTone;
	type?: "button" | "submit" | "reset";
	class?: never;
	style?: never;
	classList?: never;
};

function GroupButton(props: GroupButtonProps) {
	const merged = mergeProps(
		{
			type: "button" as const,
			emphasis: "tertiary" as const,
			size: "xs" as const,
		},
		props,
	);
	const [local, rest] = splitProps(merged, [
		"type",
		"emphasis",
		"tone",
		"size",
	]);
	return (
		<GroupButtonSizeContext.Provider value={() => local.size}>
			<Button
				type={local.type}
				emphasis={local.emphasis}
				tone={local.tone}
				{...rest}
			/>
		</GroupButtonSizeContext.Provider>
	);
}

// ─── Text ───

function GroupText(
	props: ComponentProps<"span"> & {
		class?: never;
		style?: never;
		classList?: never;
	},
) {
	return (
		<span
			class="flex flex-row items-center gap-2 text-micro text-ink-3 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none"
			{...props}
		/>
	);
}

// ─── GroupInput ───

function GroupInput(props: ComponentProps<typeof Input>) {
	return <Input data-slot="input-group-control" {...props} />;
}

// ─── GroupTextarea ───

function GroupTextarea(props: ComponentProps<typeof Textarea>) {
	return <Textarea data-slot="input-group-control" {...props} />;
}

// ─── Exports ───

export const InputGroup = Object.assign(Root, {
	Addon,
	Button: GroupButton,
	Text: GroupText,
	Input: GroupInput,
	Textarea: GroupTextarea,
});
