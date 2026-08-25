import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { ValidComponent } from "solid-js";

// ─── Trigger ───

type TriggerProps<T extends ValidComponent = "button"> =
	TooltipPrimitive.TooltipTriggerProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Trigger<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, TriggerProps<T>>,
) {
	return (
		<TooltipPrimitive.Trigger
			{...(props as TooltipPrimitive.TooltipTriggerProps)}
		/>
	);
}

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	TooltipPrimitive.TooltipContentProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				class="z-50 origin-(--kb-popover-content-transform-origin) overflow-hidden rounded-md border bg-surface px-3 py-1.5 text-callout text-ink-1 animate-content-hide data-[expanded]:animate-content-show"
				{...props}
			/>
		</TooltipPrimitive.Portal>
	);
}

// ─── Root ───

function Root(props: TooltipPrimitive.TooltipRootProps) {
	return <TooltipPrimitive.Root gutter={4} {...props} />;
}

// ─── Exports ───

export const Tooltip = Object.assign(Root, {
	Trigger,
	Content,
});
