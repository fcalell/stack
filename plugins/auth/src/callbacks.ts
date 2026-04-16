export interface AuthCallbacks {
	sendOTP: (data: {
		email: string;
		otp: string;
		context: Record<string, unknown>;
	}) => Promise<void>;
	sendInvitation?: (data: {
		email: string;
		organization: { id: string; name: string; slug: string };
		invitedBy: { name: string; email: string };
		context: Record<string, unknown>;
	}) => Promise<void>;
}

export function defineAuthCallbacks(callbacks: AuthCallbacks): AuthCallbacks {
	return callbacks;
}
