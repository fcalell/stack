import slugifyPkg from "slugify";

const DEFAULT_RESERVED = [
	"admin",
	"api",
	"system",
	"auth",
	"new",
	"settings",
] as const;

export function createSlugify(
	reservedSlugs: readonly string[] = DEFAULT_RESERVED,
) {
	const reserved = new Set<string>(reservedSlugs);

	function slugify(text: string): string {
		const slug = slugifyPkg(text, { lower: true, strict: true, trim: true });

		if (reserved.has(slug)) {
			throw new Error("Slug is reserved");
		}

		return slug;
	}

	function isReserved(slug: string): boolean {
		return reserved.has(slug);
	}

	return { slugify, isReserved };
}

const { slugify, isReserved: isReservedSlug } = createSlugify();

export { isReservedSlug, slugify };
