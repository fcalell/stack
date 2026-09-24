import type { Closed } from "../../lib/closed";
import { Glyph } from "../../lib/glyph";
import { useIcon } from "../../lib/icons";

export interface IconProps extends Closed {
	name: string;
}

// An icon from the consumer's closed set, drawn at the body line in ink.
export function Icon({ name }: IconProps) {
	return <Glyph icon={useIcon(name)} />;
}
