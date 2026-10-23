// The module `plugin-vite` and `plugin-expo` serve for `.stack/schema.ts`: each
// procedure's input as JSON Schema, its kind and its scope key, which the
// client reads (`./tanstack-query.tsx`).
declare module "virtual:stack-schema" {
	export const SCHEMA: Readonly<
		Record<
			string,
			{
				readonly input: object | null;
				readonly kind: "query" | "mutation";
				readonly scope: string | null;
			}
		>
	>;
}
