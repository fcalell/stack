export interface AccessControlLike {
	statements: Record<string, readonly string[]>;
	newRole: (...args: never[]) => unknown;
}

export interface Statements {
	[resource: string]: readonly string[];
}

export interface Role {
	[resource: string]: readonly string[];
}

export function createAccessControl<
	T extends Record<string, readonly string[]>,
>(statements: T) {
	return {
		statements,
		newRole(
			permissions: {
				[K in keyof T]?: T[K][number][];
			},
		): Role {
			return permissions as Role;
		},
	};
}

export function getStatements(
	ac: { statements?: Record<string, readonly string[]> } | undefined,
): Record<string, readonly string[]> | undefined {
	return ac?.statements;
}

// Full resource/action universe for the framework's default organization
// roles — the same record `hasPermission` ultimately checks against at
// runtime (each role's own `.statements`, built from this universe via
// `newRole` below), and what `plugin-auth` contributes to
// `api.slots.rbacStatements` for `procedure({ rbac: [...] })`'s type-level
// autocomplete when the consumer hasn't supplied a custom `ac`.
export const defaultOrgStatements = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
	team: ["create", "update", "delete"],
} as const;

const orgAc = createAccessControl(defaultOrgStatements);

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
