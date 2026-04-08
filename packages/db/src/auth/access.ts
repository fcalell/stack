export type {
	AccessControl,
	AuthorizeResponse,
	Role,
	Statements,
} from "better-auth/plugins/access";
export { role } from "better-auth/plugins/access";

import { createAccessControl as _createAccessControl } from "better-auth/plugins/access";

export function createAccessControl<
	T extends Record<string, readonly string[]>,
>(statements: T) {
	const ac = _createAccessControl(statements);
	return Object.assign(ac, { statements });
}

export function getStatements(
	// biome-ignore lint/suspicious/noExplicitAny: AC object may come from config with any type
	ac: any,
): Record<string, readonly string[]> | undefined {
	return ac?.statements;
}

const orgStatements = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
	team: ["create", "update", "delete"],
} as const;

const orgAc = createAccessControl(orgStatements);

export const defaultOrgRoles = {
	owner: orgAc.newRole({
		organization: ["update", "delete"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
	}),
	admin: orgAc.newRole({
		organization: ["update"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
	}),
	member: orgAc.newRole({
		organization: [],
		member: [],
		invitation: [],
		team: [],
	}),
} as const;
