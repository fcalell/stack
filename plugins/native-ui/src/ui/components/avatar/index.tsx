import type { Closed } from "../../lib/closed";
import { AvatarBase } from "./base";

export interface AvatarProps extends Closed {
	/** The person's name: the accessible name, and the initials of its first two words without an image (a short phrase; only the initials draw). */
	name: string;
	src?: string;
}

// The image, else (none, or one that failed to load) the name's initials on
// the fill step its hash picks, so one name keeps one fill.
export function Avatar({ name, src }: AvatarProps) {
	return <AvatarBase name={name} src={src} />;
}
