import type { ContentTone } from "@fcalell/ui-core/variants";
import type { LucideIcon } from "lucide-react-native";
import { useTokenColor } from "./theme";

// The glyphs stack draws on its own (back, close, more, a tick, a ring), in
// a content tone resolved against the active theme. Sized to the body line.
export const GLYPH_SIZE = 20;

export function Glyph({
	icon: Icon,
	tone = "ink",
	size = GLYPH_SIZE,
}: {
	icon: LucideIcon;
	tone?: ContentTone;
	size?: number;
}) {
	const color = useTokenColor(`--color-${tone}`);
	return <Icon size={size} color={color} strokeWidth={2} />;
}
