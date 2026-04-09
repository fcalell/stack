import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Content ───

type ContentProps<T extends ValidComponent = "div"> =
	TooltipPrimitive.TooltipContentProps<T> & { class?: string };

function Content<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, ContentProps<T>>,
) {
	const [local, rest] = splitProps(props as ContentProps, ["class"]);
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				class={cn(
					"z-50 origin-(--kb-popover-content-transform-origin) overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground animate-content-hide data-[expanded]:animate-content-show",
					local.class,
				)}
				{...rest}
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
	Trigger: TooltipPrimitive.Trigger,
	Content,
});
