// The output shapes of the `auth.*` procedures whose better-auth types name a
// package a consumer does not install. The consumer's `AppRouter` is emitted
// as a declaration; a type aliasing a third-party one is emitted under that
// package's path and degrades to `any` where the package does not resolve. So
// each is written out here, and each procedure declares it as its output:
// the compiler checks the endpoint's value against it.

// The public face of an OAuth client: the fields the endpoint answers and a
// consent screen draws.
export interface OAuthClientPublic {
	client_id: string;
	client_name?: string;
	client_uri?: string;
	logo_uri?: string;
	contacts?: string[];
	tos_uri?: string;
	policy_uri?: string;
}

export type InvitationStatus = "pending" | "accepted" | "rejected" | "canceled";

export interface Invitation {
	id: string;
	organizationId: string;
	email: string;
	role: string;
	status: InvitationStatus;
	inviterId: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface OrganizationMember {
	id: string;
	organizationId: string;
	userId: string;
	role: string;
	createdAt: Date;
}

// The answer of `acceptInvitation`.
export interface AcceptedInvitation {
	invitation: Invitation;
	member: OrganizationMember;
}

// The answer of `rejectInvitation`.
export interface RejectedInvitation {
	invitation: Invitation | null;
	member: null;
}

// The organization `setActive` answers, with its members and invitations.
export interface ActiveOrganization {
	id: string;
	name: string;
	slug: string;
	createdAt: Date;
	logo?: string | null;
	metadata?: unknown;
	members: (OrganizationMember & {
		user: { id: string; email: string; name: string; image?: string };
	})[];
	invitations: Invitation[];
}
