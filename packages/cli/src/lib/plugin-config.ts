import type { z } from "zod";
import { StackError } from "#lib/errors";

// Wraps a Zod schema into a config factory used by plugins. Merges user
// options over defaults and validates the result; on failure, throws a
// StackError so the CLI can catch all plugin-config failures uniformly.
//
// The generic `TOptions` is explicit so callers (plugins) can pin the
// exact option type used for `createPlugin`'s `TOptions` inference —
// TypeScript won't reliably propagate `z.input<TSchema>` through nested
// generics on its own.
export function fromSchema<
	TOptions = unknown,
	TSchema extends z.ZodTypeAny = z.ZodTypeAny,
>(
	schema: TSchema,
	defaults?: Partial<TOptions>,
): (options: TOptions) => TOptions {
	return (options) => {
		const merged = {
			...(defaults ?? {}),
			...((options ?? {}) as object),
		} as TOptions;

		const result = schema.safeParse(merged);
		if (!result.success) {
			const summary = result.error.issues
				.map((issue) => {
					const path = issue.path.length ? issue.path.join(".") : "(root)";
					return `${path}: ${issue.message}`;
				})
				.join("; ");
			throw new StackError(
				`Invalid plugin options: ${summary}`,
				"PLUGIN_CONFIG_INVALID",
			);
		}
		return result.data as TOptions;
	};
}
