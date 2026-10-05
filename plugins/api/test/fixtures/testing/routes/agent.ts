import { procedure } from "virtual:stack-procedure";
import { z } from "zod";
import { ApiError } from "../../../../src/error.ts";
import { org } from "./scoped.ts";

// How many agent procedures have run, for a test to prove none did.
let ran = 0;

export const agent = {
	// Who the procedure runs as, and what headers it can see.
	whoami: procedure({ auth: true, scope: org }).query(async ({ context }) => {
		ran += 1;
		return {
			userId: context.user.id,
			sessionId: context.session.id,
			agent: context.user.agent === true,
			headers: [...context.reqHeaders.keys()].sort(),
			cookieOnRequest: context.httpRequest.headers.has("cookie"),
		};
	}),
	// A write: a mutation carries no read-only hint.
	note: procedure({ auth: true, scope: org })
		.input(z.object({ text: z.string() }))
		.mutation(async ({ input }) => {
			ran += 1;
			return { saved: input.text };
		}),
	// Dates arrive as strings and the procedure holds `Date`s.
	due: procedure({ auth: true, scope: org })
		.input(
			z.object({
				at: z.date(),
				also: z.array(z.date()).optional(),
				on: z.date().nullable().default(null),
			}),
		)
		.query(async ({ input }) => {
			ran += 1;
			return {
				at: input.at,
				isDate: input.at instanceof Date,
				also: input.also?.map((date) => date instanceof Date) ?? null,
			};
		}),
	// A list output: not an object, so the result wraps it.
	list: procedure({ auth: true, scope: org }).query(async () => {
		ran += 1;
		return [{ id: 1 }, { id: 2 }];
	}),
	refuse: procedure({ auth: true, scope: org }).query(async () => {
		ran += 1;
		throw new ApiError("FORBIDDEN", {
			message: "Not for you",
			data: { why: "policy" },
		});
	}),
	boom: procedure({ auth: true, scope: org }).query(async () => {
		ran += 1;
		throw new Error("secret detail");
	}),
	// An output JSON cannot hold.
	big: procedure({ auth: true, scope: org }).query(async () => {
		ran += 1;
		return { n: 1n };
	}),
	// A bare handler: no kind, so no read-only hint either.
	bare: procedure({ auth: true, scope: org }).handler(async () => ({
		ok: true,
	})),
	// What has run so far, read over /rpc.
	calls: procedure().query(async () => ran),
};
