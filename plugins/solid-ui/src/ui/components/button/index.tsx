import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
	button,
	type ButtonEmphasis,
	buttonLabel,
	buttonMuted,
	BUTTON_MUTED_LABEL,
	type ButtonSize,
	type ButtonTone,
} from "@fcalell/ui-core/variants";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "#lib/cn";

// The fill matrix carries no ink, so the label table rides the same node.
// Display, motion and the focus ring are web overlays composed after both.
const SHELL =
	"inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-[color,background-color,border-color,opacity] duration-fast ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive [&_svg]:pointer-events-none [&_svg]:shrink-0";

// Sized to this plugin's own glyph, which is why it stays out of the matrix.
const GLYPH: Record<ButtonSize, string> = {
	sm: "[&_svg]:size-4",
	md: "[&_svg]:size-4",
	lg: "[&_svg]:size-5",
};

type ButtonProps<T extends ValidComponent = "button"> =
	ButtonPrimitive.ButtonRootProps<T> & {
		emphasis?: ButtonEmphasis;
		tone?: ButtonTone;
		size?: ButtonSize;
		class?: string;
		children?: JSX.Element;
	};

function Button<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, ButtonProps<T>>,
) {
	const [local, rest] = splitProps(props as ButtonProps, [
		"emphasis",
		"tone",
		"size",
		"class",
		"disabled",
	]);
	const emphasis = () => local.emphasis ?? "primary";
	const size = () => local.size ?? "md";
	return (
		<ButtonPrimitive.Root
			disabled={local.disabled}
			class={cn(
				button({ emphasis: emphasis(), tone: local.tone, size: size() }),
				buttonLabel({ emphasis: emphasis(), tone: local.tone, size: size() }),
				SHELL,
				GLYPH[size()],
				local.disabled
					? cn(
							buttonMuted({ emphasis: emphasis() }),
							BUTTON_MUTED_LABEL,
							"pointer-events-none",
						)
					: cn(
							"hover:opacity-90 active:opacity-80",
							emphasis() === "tertiary" && "hover:bg-surface-2",
						),
				local.class,
			)}
			{...rest}
		/>
	);
}

export type { ButtonProps };
export { Button };
