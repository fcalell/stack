import { auth } from "@fcalell/plugin-auth";

export default auth.defineCallbacks({
	sendOTP({ email, code }) {
		// TODO: send OTP email
		console.log(`OTP for ${email}: ${code}`);
	},
	sendInvitation({ email, orgName }) {
		// TODO: send invitation email
		console.log(`Invitation for ${email} to ${orgName}`);
	},
});
