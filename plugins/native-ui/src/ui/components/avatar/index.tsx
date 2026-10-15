import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed";
import { AvatarBase } from "./base";

export interface AvatarProps extends Closed {
	/** The person's name: the accessible name, and the initials of its first two words without an image (a short phrase; only the initials draw). A selection paints the circle until its read lands. */
	name: Datum<string>;
	/** The image's URL; without it, or when it fails to load, the circle draws the name's initials. A selection paints the circle like a `name` does, so the initials do not swap for the image. */
	src?: Datum<string | undefined>;
}

// The image, else (none, or one that failed to load) the name's initials on
// the fill step its hash picks, so one name keeps one fill.
export function Avatar({ name, src }: AvatarProps) {
	const [person, picture] = useSelections([name, src]);
	if (person.painted || picture.painted) return <AvatarBase name="" painted />;
	return <AvatarBase name={person.value} src={picture.value} />;
}
