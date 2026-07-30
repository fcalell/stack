import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
	RADIUS_RUNGS,
	SPACING_RUNGS,
	TRACKED_ROLES,
	TYPE_ROLES,
} from "#tokens";

// tailwind-merge ships no knowledge of the contract's scales, so `text-h1`
// reads as a color and `p-card` as an unknown class: two rungs of one scale
// both survive a merge. Registering them under `theme` puts them where the
// default config already looks, which reaches all sixteen `rounded*` groups
// instead of the single group an added class group can name. The five lists
// are the driving token lists themselves, never a copy.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: [...TYPE_ROLES],
			leading: [...TYPE_ROLES],
			tracking: [...TRACKED_ROLES],
			radius: [...RADIUS_RUNGS],
			spacing: [...SPACING_RUNGS],
		},
	},
});

// Registering the type roles as font sizes activates tailwind-merge's
// `font-size` -> `leading` conflict: a role composed *after* a `leading-` class
// deletes it. Compose the role first. See the README.
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
