import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

const email = z.object({ email: z.string().min(1) });

// The sign-in's two steps, where a consumer has them under `orpc.auth`: the
// email a code is sent to (answered back, so the next step holds the address
// that was typed), and the code it verifies.
export const auth = {
	signIn: {
		sendOtp: procedure({ writes: ["requests"] })
			.input(email)
			.output(email)
			.mutation(({ input }) => input),

		verifyOtp: procedure({ writes: ["requests"] })
			.input(email.extend({ code: z.string().length(6) }))
			.mutation(() => undefined),
	},
};
