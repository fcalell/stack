import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

// Type the parameter as your worker's `Env` (`AuthCallbacks<Env>`) to reach
// bindings through the `env` every payload carries.
const callbacks: AuthCallbacks = {
	sendOTP({ email, code }) {
		// TODO: send OTP email
		console.log(`OTP for ${email}: ${code}`);
	},
	sendInvitation({ email, orgName }) {
		// TODO: send invitation email
		console.log(`Invitation for ${email} to ${orgName}`);
	},
};

export default callbacks;
