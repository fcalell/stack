import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed.ts";
import { AvatarBase } from "./base.tsx";

/** A person's circle. */
export interface AvatarProps extends Closed {
	/** The person's name: the accessible name, and the initials of its first two words without an image (a short phrase; only the initials draw; an email address reads by its local part, its dots parting words). A selection paints the circle until its read lands. */
	name: Datum<string>;
	/** The image's URL; without it, or when it fails to load, the circle draws the name's initials. A selection paints the circle like a `name` does, so the initials do not swap for the image. */
	src?: Datum<string | undefined>;
}

/** The image, else (none, or one that failed to load) the name's initials on the fill step its hash picks, so one name keeps one fill. */
export function Avatar({ name, src }: AvatarProps) {
	const [person, picture] = useSelections([name, src]);
	if (paints(person) || paints(picture)) return <AvatarBase name="" painted />;
	// An ended read draws no circle; the frame that holds it says why.
	if (person.painted || picture.painted) return null;
	return <AvatarBase name={person.value} src={picture.value} />;
}
