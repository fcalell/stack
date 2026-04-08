import type { AuthPolicy, FieldConfig } from "#kit/config";

export interface AuthDefinition {
	cookies?: AuthPolicy["cookies"];
	session?: AuthPolicy["session"];
	user?: AuthPolicy["user"];
	organization?: AuthPolicy["organization"];
}

export function defineAuth(config: AuthDefinition): AuthPolicy {
	const policy: AuthPolicy = {};

	if (config.cookies) policy.cookies = config.cookies;
	if (config.session) policy.session = config.session;
	if (config.user) policy.user = config.user;
	if (config.organization) policy.organization = config.organization;

	return policy;
}

export type { AuthPolicy, FieldConfig };
