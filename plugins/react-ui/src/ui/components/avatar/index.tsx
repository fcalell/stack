import { cn } from "@fcalell/ui-core/cn";
import { avatar, avatarLabel, avatarStep } from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { Closed } from "../../lib/closed.ts";

const CIRCLE =
	"inline-flex items-center justify-center shrink-0 overflow-hidden";
const IMAGE = "shrink-0 object-cover";

/** A person's circle. */
export interface AvatarProps extends Closed {
	/** The person's name: the accessible name, and the initials without an image. */
	name: string;
	/** The image's URL; without it, or when it fails to load, the circle draws the name's initials. */
	src?: string;
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

/** The image, else (none, or one that failed to load) the name's initials on the fill step its hash picks, so one name keeps one fill. */
export function Avatar({ name, src }: AvatarProps) {
	const [failed, setFailed] = useState<string>();
	const step = avatarStep(name);
	// Keyed by the URL that failed, so a new src is tried again.
	if (src && src !== failed)
		return (
			<img
				src={src}
				alt={name}
				onError={() => setFailed(src)}
				className={cn(avatar(), IMAGE)}
			/>
		);
	return (
		<span role="img" aria-label={name} className={cn(avatar({ step }), CIRCLE)}>
			<span aria-hidden className={avatarLabel({ step })}>
				{initials(name)}
			</span>
		</span>
	);
}
