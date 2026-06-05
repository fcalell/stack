import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

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
