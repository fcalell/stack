import slugifyPkg from "slugify";

// The words a slug may never be: the addresses every stack app serves or a
// router reads as an act. plugin-auth refuses them as organization slugs,
// beside the consumer's own top-level routes.
export const RESERVED_SLUGS = [
	"admin",
	"api",
	"system",
	"auth",
	"new",
	"settings",
] as const;

// `slugify` turns text into a URL segment and never refuses; `isReserved`
// answers whether a slug is taken by the app's own routes, so a procedure
// names the refusal as its own field error.
export function createSlugify(
	reservedSlugs: readonly string[] = RESERVED_SLUGS,
) {
	const reserved = new Set<string>(reservedSlugs);

	// A dot is a word boundary, so a domain reads as its words.
	function slugify(text: string): string {
		return slugifyPkg(text.replaceAll(".", " "), {
			lower: true,
			strict: true,
			trim: true,
		});
	}

	function isReserved(slug: string): boolean {
		return reserved.has(slug);
	}

	return { slugify, isReserved };
}

const { slugify, isReserved: isReservedSlug } = createSlugify();

export { isReservedSlug, slugify };
