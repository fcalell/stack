import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

// Type the parameter as your worker's `Env` (`AuthCallbacks<Env>`) to reach
// bindings through the `env` every payload carries. `sendOTP` is required
// while `emailOtp` is on (the default); with `emailOtp: false` delete it.
// The stubs below log in dev and throw anywhere else: a code in Workers Logs
// is a leaked sign-in. `stack deploy` refuses while a `// TODO` marker stays.
const isDev = (env: unknown) =>
	(env as { STACK_DEV?: string }).STACK_DEV === "1";

const callbacks: AuthCallbacks = {
	sendOTP({ email, code, env }) {
		// TODO: send OTP email
		if (!isDev(env))
			throw new Error(
				"sendOTP is not implemented: edit src/worker/plugins/auth.ts",
			);
		console.log(`OTP for ${email}: ${code}`);
	},
	sendInvitation({ invitationId, email, organization, env }) {
		// TODO: send invitation email linking to your accept page
		if (!isDev(env))
			throw new Error(
				"sendInvitation is not implemented: edit src/worker/plugins/auth.ts",
			);
		console.log(
			`Invitation ${invitationId} for ${email} to ${organization.name}`,
		);
	},
	// Your own better-auth plugins, registered after the framework's:
	// plugins: [myEnrolmentLink()],
};

export default callbacks;
