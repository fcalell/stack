import { cn } from "@fcalell/ui-core/cn";
import { avatar, avatarLabel, avatarStep } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { PAINT_BOX } from "../../lib/paint.tsx";

const CIRCLE =
	"inline-flex items-center justify-center shrink-0 overflow-hidden";
const IMAGE = "shrink-0 object-cover";

// A name's first two words; an email address stands for a name by its local
// part, whose dots, underscores and hyphens part words ("ada.lovelace@…"
// reads AL).
function initials(name: string): string {
	const [local] = name.split("@", 1);
	return (local ?? "")
		.split(/[\s._-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

/** The image, else (none, or one that failed to load) the name's initials on the fill step its hash picks, so one name keeps one fill. `painted` is the circle while its person is not here: its box filled, nothing drawn in it. Outside the package's exports. */
export function AvatarBase({
	name,
	src,
	painted,
}: {
	name: string;
	src?: string;
	painted?: boolean;
}) {
	const [failed, setFailed] = useState<string>();
	const step = avatarStep(name);
	if (painted)
		return <span aria-hidden className={cn(avatar(), CIRCLE, PAINT_BOX)} />;
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
