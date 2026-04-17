import { describe, expect, it } from "vitest";
import { z } from "zod";
import { StackError } from "#lib/errors";
import { fromSchema } from "#lib/plugin-config";

describe("fromSchema", () => {
	const schema = z.object({
		name: z.string(),
		count: z.number().default(1),
		enabled: z.boolean().default(false),
	});

	type Options = z.input<typeof schema>;

	it("applies defaults when options are omitted", () => {
		const factory = fromSchema<Options>(schema, {
			name: "alice",
			enabled: true,
		});
		const result = factory(undefined as unknown as Options);
		expect(result).toEqual({ name: "alice", count: 1, enabled: true });
	});

	it("options override defaults", () => {
		const factory = fromSchema<Options>(schema, {
			name: "alice",
			enabled: false,
		});
		const result = factory({ name: "bob", enabled: true });
		expect(result).toEqual({ name: "bob", count: 1, enabled: true });
	});

	it("throws StackError with PLUGIN_CONFIG_INVALID on invalid options", () => {
		const factory = fromSchema<Options>(schema);
		try {
			factory({ name: 123 as unknown as string });
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(StackError);
			expect((err as StackError).code).toBe("PLUGIN_CONFIG_INVALID");
			expect((err as StackError).message).toContain("name");
		}
	});
});
