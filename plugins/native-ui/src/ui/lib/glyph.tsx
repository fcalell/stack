import type { IconName } from "@fcalell/ui-core/descriptors";
import { ICON_STROKE, type IconStroke } from "@fcalell/ui-core/tokens";
import type { ContentTone } from "@fcalell/ui-core/variants";
import * as lucide from "lucide-react-native";
import { useTokenPx } from "./frame";
import { useTokenColor } from "./theme";

// Every Lucide name to its glyph; the annotation fails the build when the
// package lacks a name ui-core's `lucide` carries.
export const GLYPHS: Record<IconName, lucide.LucideIcon> = lucide;

// The glyphs stack draws on its own (back, close, more, a tick, a ring), in
// a content tone resolved against the active theme. Sized to the `icon` role
// (`--spacing-icon`), the body text's icon, unless the caller gives a size.

export function Glyph({
	icon: Icon,
	tone = "ink-body",
	size,
	stroke = "line",
}: {
	icon: lucide.LucideIcon;
	tone?: ContentTone;
	size?: number;
	stroke?: IconStroke;
}) {
	const color = useTokenColor(`--color-${tone}`);
	const icon = useTokenPx("--spacing-icon");
	return (
		<Icon size={size ?? icon} color={color} strokeWidth={ICON_STROKE[stroke]} />
	);
}
