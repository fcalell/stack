import * as ImagePrimitive from "@kobalte/core/image";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

const avatarVariants = cva(
	"relative flex shrink-0 overflow-hidden rounded-full",
	{
		variants: {
			size: {
				sm: "size-8 text-micro",
				default: "size-10 text-callout",
				lg: "size-12 text-body",
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
			class?: never;
			style?: never;
			classList?: never;
		};

function Root<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, AvatarProps<T>>,
) {
	const [local, rest] = splitProps(props as AvatarProps, ["size"]);
	return (
		<ImagePrimitive.Root
			class={avatarVariants({ size: local.size })}
			{...rest}
		/>
	);
}

type ImageProps<T extends ValidComponent = "img"> =
	ImagePrimitive.ImageImgProps<T> & {
		alt: string;
		class?: never;
		style?: never;
		classList?: never;
	};

function Image<T extends ValidComponent = "img">(
	props: PolymorphicProps<T, ImageProps<T>>,
) {
	return (
		<ImagePrimitive.Img
			class="aspect-square size-full"
			{...(props as ImageProps)}
		/>
	);
}

type FallbackProps<T extends ValidComponent = "span"> =
	ImagePrimitive.ImageFallbackProps<T> & {
		class?: never;
		style?: never;
		classList?: never;
	};

function Fallback<T extends ValidComponent = "span">(
	props: PolymorphicProps<T, FallbackProps<T>>,
) {
	return (
		<ImagePrimitive.Fallback
			class="flex size-full items-center justify-center bg-surface-2 font-mono text-ink-1"
			{...(props as FallbackProps)}
		/>
	);
}

export const Avatar = Object.assign(Root, {
	Image,
	Fallback,
});

export { avatarVariants };
