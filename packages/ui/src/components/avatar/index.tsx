import * as ImagePrimitive from "@kobalte/core/image";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

const avatarVariants = cva(
	"relative flex shrink-0 overflow-hidden rounded-full",
	{
		variants: {
			size: {
				sm: "size-8 text-xs",
				default: "size-10 text-sm",
				lg: "size-12 text-base",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type AvatarProps<T extends ValidComponent = "span"> =
	ImagePrimitive.ImageRootProps<T> &
		VariantProps<typeof avatarVariants> & {
			class?: string;
		};

function Root<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, AvatarProps<T>>,
) {
	const [local, rest] = splitProps(props as AvatarProps, ["class", "size"]);
	return (
		<ImagePrimitive.Root
			class={cn(avatarVariants({ size: local.size }), local.class)}
			{...rest}
		/>
	);
}

type ImageProps<T extends ValidComponent = "img"> =
	ImagePrimitive.ImageImgProps<T> & {
		class?: string;
		alt: string;
	};

function Image<T extends ValidComponent = "img">(
	props: PolymorphicProps<T, ImageProps<T>>,
) {
	const [local, rest] = splitProps(props as ImageProps, ["class"]);
	return (
		<ImagePrimitive.Img
			class={cn("aspect-square size-full", local.class)}
			{...rest}
		/>
	);
}

type FallbackProps<T extends ValidComponent = "span"> =
	ImagePrimitive.ImageFallbackProps<T> & { class?: string };

function Fallback<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, FallbackProps<T>>,
) {
	const [local, rest] = splitProps(props as FallbackProps, ["class"]);
	return (
		<ImagePrimitive.Fallback
			class={cn(
				"flex size-full items-center justify-center bg-muted font-mono text-foreground",
				local.class,
			)}
			{...rest}
		/>
	);
}

export const Avatar = Object.assign(Root, {
	Image,
	Fallback,
});

export { avatarVariants };
