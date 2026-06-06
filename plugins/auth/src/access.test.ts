import { describe, expect, it } from "vitest";
import { createAccessControl, defaultOrgRoles, getStatements } from "./access";

describe("createAccessControl", () => {
	it("returns object with statements matching input", () => {
		const statements = {
			project: ["create", "read", "delete"],
		} as const;
		const ac = createAccessControl(statements);

		expect(ac.statements).toBe(statements);
	});

	it("newRole returns the permissions object", () => {
		const ac = createAccessControl({
			project: ["create", "read"],
		} as const);
		const role = ac.newRole({ project: ["create"] });
		expect(role).toEqual({ project: ["create"] });
	});

	it("handles multiple resources", () => {
		const statements = {
			project: ["create", "read", "update", "delete"],
			member: ["create", "delete"],
		} as const;
		const ac = createAccessControl(statements);
		expect(ac.statements).toBe(statements);

		const role = ac.newRole({
			project: ["create", "read"],
			member: ["create"],
		});
		expect(role).toEqual({
			project: ["create", "read"],
			member: ["create"],
		});
	});
});

describe("getStatements", () => {
	it("returns statements from an access control instance", () => {
		const statements = { project: ["create"] } as const;
		const ac = createAccessControl(statements);
		expect(getStatements(ac)).toBe(statements);
	});

	it("returns undefined when ac is undefined", () => {
		expect(getStatements(undefined)).toBeUndefined();
	});

	it("returns undefined when ac has no statements property", () => {
		expect(getStatements({} as never)).toBeUndefined();
	});
});

describe("defaultOrgRoles", () => {
	it("owner role has all permissions", () => {
		expect(defaultOrgRoles.owner).toEqual({
			organization: ["update", "delete"],
			member: ["create", "update", "delete"],
			invitation: ["create", "cancel"],
			team: ["create", "update", "delete"],
		});
	});
});
