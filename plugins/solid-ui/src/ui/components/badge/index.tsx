import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

const badgeVariants = cva(
	"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-[color,background-color,border-color] duration-base ease-ui",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				outline: "text-foreground",
				destructive: "border-destructive/40 bg-destructive/20 text-destructive",
				success: "border-success/40 bg-success/20 text-success",
				warning: "border-warning/40 bg-warning/20 text-warning",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = VariantProps<typeof badgeVariants> & {
	class?: string;
	round?: boolean;
};

function Badge<T extends ValidComponent = "div">(
	props: PolymorphicProps<T, BadgeProps>,
) {
	const [local, rest] = splitProps(props as BadgeProps, [
		"class",
		"variant",
		"round",
	]);
	return (
		<Polymorphic
			as="div"
			class={cn(
				badgeVariants({ variant: local.variant }),
				local.round && "rounded-full",
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { BadgeProps };
export { Badge, badgeVariants };
