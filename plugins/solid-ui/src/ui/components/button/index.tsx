import {
	BUTTON_MUTED_LABEL,
	type ButtonEmphasis,
	type ButtonSize,
	type ButtonTone,
	button,
	buttonLabel,
	buttonMuted,
} from "@fcalell/ui-core/variants";
import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { LoaderCircle } from "lucide-solid";
import type { JSX, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { groupButtonClasses, useGroupButtonSize } from "#lib/input-group";

// The fill matrix carries no ink, so the label table rides the same node.
// Display, motion and the focus ring are web overlays composed after both.
const SHELL =
	"inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-[color,background-color,border-color] duration-(--duration-fast) ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive [&_svg]:pointer-events-none [&_svg]:shrink-0";

// Sized to this plugin's own glyph, which is why it stays out of the matrix.
const GLYPH: Record<ButtonSize, string> = {
	sm: "[&_svg]:size-4",
	md: "[&_svg]:size-4",
	lg: "[&_svg]:size-5",
};

// Hover and press move the ground, never the alpha. Fading a filled control
// composites its label with its own fill, which drops the `accent-ink` on
// `accent` 4.5:1 the contract guarantees, and it gives a transparent emphasis
// less contrast rather than more. Every danger cell lands on `danger-soft`,
// which the contract guarantees `danger` text clears; the filled cell switches
// its ink to match, since `danger-ink` is built for the solid fill.
const GROUND: Record<ButtonEmphasis, Record<ButtonTone, string>> = {
	primary: {
		neutral: "hover:bg-ink-2 active:bg-ink-3",
		danger: "hover:bg-danger-soft hover:text-danger active:bg-danger-soft",
	},
	secondary: {
		neutral: "hover:bg-surface-2 active:bg-surface-3",
		danger: "hover:bg-danger-soft active:bg-danger-soft",
	},
	tertiary: {
		neutral: "hover:bg-surface-2 active:bg-surface-3",
		danger: "hover:bg-danger-soft active:bg-danger-soft",
	},
};

type ButtonProps<T extends ValidComponent = "button"> =
	ButtonPrimitive.ButtonRootProps<T> & {
		emphasis?: ButtonEmphasis;
		tone?: ButtonTone;
		size?: ButtonSize;
		loading?: boolean;
		children?: JSX.Element;
		class?: never;
		style?: never;
		classList?: never;
	};

function Button<T extends ValidComponent = "button">(
	props: PolymorphicProps<T, ButtonProps<T>>,
) {
	const [local, rest] = splitProps(props as ButtonProps, [
		"emphasis",
		"tone",
		"size",
		"disabled",
		"loading",
		"children",
	]);
	const emphasis = () => local.emphasis ?? "primary";
	const tone = () => local.tone ?? "neutral";
	const size = () => local.size ?? "md";
	const groupSize = useGroupButtonSize();
	return (
		<ButtonPrimitive.Root
			disabled={local.disabled || local.loading}
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
					: GROUND[emphasis()][tone()],
				local.loading && "pointer-events-none",
				groupSize && groupButtonClasses({ size: groupSize() }),
			)}
			{...rest}
		>
			{/* The glyph is anatomy, not a matrix cell: it spins beside the label
			    in the label's own content tone via currentColor. */}
			<Show when={local.loading}>
				<LoaderCircle class="animate-spin" aria-hidden="true" />
			</Show>
			{local.children}
		</ButtonPrimitive.Root>
	);
}

export type { ButtonProps };
export { Button };
