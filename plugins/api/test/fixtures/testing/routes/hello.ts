import { procedure } from "virtual:stack-procedure";
import { ApiError } from "../../../../src/error.ts";

export const hello = {
	// Answers from the env the worker was handed.
	secret: procedure().query(async ({ context }) =>
		String((context.env as Record<string, unknown>).FIXTURE_SECRET),
	),
	// Answers from a key a testing plugin added to the env.
	extra: procedure().query(async ({ context }) =>
		String((context.env as Record<string, unknown>).FIXTURE_EXTRA),
	),
	// Refuses a request without a cookie, else answers with it.
	cookie: procedure().query(async ({ context }) => {
		const cookie = context.request.headers.get("cookie");
		if (!cookie) throw new ApiError("FORBIDDEN");
		return cookie;
	}),
};
