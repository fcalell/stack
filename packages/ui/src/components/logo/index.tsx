import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, JSX } from "solid-js";
import { Show, splitProps } from "solid-js";

const logoIconClasses = cva("shrink-0", {
	variants: {
		size: {
			sm: "size-6",
			default: "size-8",
			lg: "size-10",
			xl: "size-12",
			"2xl": "size-16",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const logoContainerClasses = cva("inline-flex", {
	variants: {
		size: {
			sm: "gap-1",
			default: "gap-2",
			lg: "gap-2",
			xl: "gap-3",
			"2xl": "gap-3",
		},
		align: {
			start: "items-start",
			center: "items-center",
			end: "items-end",
		},
	},
	defaultVariants: {
		size: "default",
		align: "center",
	},
});

const logoTextClasses = cva(
	"whitespace-nowrap font-bold uppercase leading-none tracking-widest text-foreground transition-[clip-path,opacity] duration-200",
	{
		variants: {
			size: {
				sm: "text-base",
				default: "text-lg",
				lg: "text-2xl",
				xl: "text-3xl",
				"2xl": "text-4xl",
			},
			responsive: {
				false: "",
				true: "@[8rem]:[clip-path:inset(0_0_0_0)] @[8rem]:opacity-100 [clip-path:inset(0_100%_0_0)] opacity-0",
			},
		},
		defaultVariants: {
			size: "default",
			responsive: false,
		},
	},
);

type LogoProps = ComponentProps<"div"> &
	VariantProps<typeof logoIconClasses> &
	VariantProps<typeof logoContainerClasses> & {
		icon: JSX.Element;
		text?: JSX.Element;
		responsive?: boolean;
	};

function Logo(props: LogoProps) {
	const [local, rest] = splitProps(props, [
		"class",
		"size",
		"align",
		"icon",
		"text",
		"responsive",
	]);
	return (
		<div
			class={logoContainerClasses({
				size: local.size,
				align: local.align,
				className: local.class,
			})}
			{...rest}
		>
			<div class={logoIconClasses({ size: local.size })}>{local.icon}</div>
			<Show when={local.text}>
				<span
					class={logoTextClasses({
						size: local.size,
						responsive: local.responsive,
					})}
				>
					{local.text}
				</span>
			</Show>
		</div>
	);
}

export type { LogoProps };
export { Logo, logoContainerClasses, logoIconClasses, logoTextClasses };
