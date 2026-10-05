import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

// Type the parameter as your worker's `Env` (`AuthCallbacks<Env>`) to reach
// bindings through the `env` every payload carries. `sendOTP` is required
// while `emailOtp` is on (the default); with `emailOtp: false` delete it.
// With `magicLink: true`, uncomment `sendMagicLink` below.
const callbacks: AuthCallbacks = {
	sendOTP({ email, code }) {
		// TODO: send OTP email
		console.log(`OTP for ${email}: ${code}`);
	},
	sendInvitation({ invitationId, email, organization }) {
		// TODO: send invitation email linking to your accept page
		console.log(
			`Invitation ${invitationId} for ${email} to ${organization.name}`,
		);
	},
	// sendMagicLink({ email, url }) {
	// 	// TODO: send the magic link email
	// 	console.log(`Magic link for ${email}: ${url}`);
	// },
	// Your own better-auth plugins, registered after the framework's:
	// plugins: [myEnrolmentLink()],
};

export default callbacks;
