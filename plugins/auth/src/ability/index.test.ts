import { createMongoAbility } from "@casl/ability";
import { ORPCError } from "@orpc/server";
import { createAccessControl as baCreateAccessControl } from "better-auth/plugins/access";
import { describe, expect, it } from "vitest";
import { defaultOrgRoles, defaultOrgStatements } from "../access";
import {
	assertCan,
	compileStatements,
	defineAbility,
	packAbility,
	subject,
	unpackAbility,
} from "./index";

type TestSubjects = {
	Expense: { paidById: string };
	Report: { authorId: string };
	Billing: never;
};

function buildOwnershipAbility() {
	const { can, cannot, build } = defineAbility<TestSubjects, string>();
	can("update", "Expense", { paidById: "u1" });
	can("read", "Report");
	cannot("update", "Report", { authorId: "locked" });
	can("update", "Report", { authorId: "u1" });
	can("read", "Billing");
	return build();
}

describe("compileStatements subset fidelity (WS6.2)", () => {
	// The guard for the whole statements→CASL merge: for EVERY
	// (role, resource, action) triple in the default org universe, the
	// compiled ability must answer exactly like better-auth's own access
	// implementation. `better-auth/plugins/access` is pure (no network, no
	// db), so the oracle here is the real `authorize` better-auth runs
	// inside its organization endpoints — not our own grant records.
	const roleNames = Object.keys(
		defaultOrgRoles,
	) as (keyof typeof defaultOrgRoles)[];
	const orgAc = baCreateAccessControl(defaultOrgStatements);

	it("covers a non-empty triple set across more than one role", () => {
		const tripleCount =
			roleNames.length *
			Object.values(defaultOrgStatements).reduce(
				(n, actions) => n + actions.length,
				0,
			);
		expect(tripleCount).toBeGreaterThan(0);
		expect(roleNames.length).toBeGreaterThan(1);
	});

	for (const roleName of roleNames) {
		it(`compiled ability for "${roleName}" matches better-auth authorize on every triple`, () => {
			const grants = defaultOrgRoles[roleName] as Record<
				string,
				readonly string[]
			>;
			// biome-ignore lint/suspicious/noExplicitAny: newRole's input type is keyed to the statements literal; the grants record is that shape by construction.
			const realRole = orgAc.newRole(grants as any);
			const ability = createMongoAbility(compileStatements(grants));

			for (const [resource, actions] of Object.entries(defaultOrgStatements)) {
				for (const action of actions) {
					const expected = realRole.authorize({ [resource]: [action] }).success;
					expect(
						ability.can(action, resource),
						`${roleName} / ${resource} / ${action}`,
					).toBe(expected);
					// The oracle itself must agree with the grant record — a
					// silent oracle change would otherwise mask compile drift.
					expect(expected).toBe(grants[resource]?.includes(action) ?? false);
				}
			}
		});
	}
});

describe("compileStatements rejects CASL wildcard vocabulary (WS6.2)", () => {
	// CASL treats action "manage" and subject "all" as wildcards
	// (`can("manage", "all")` grants everything); better-auth's statements
	// model has no such concept and would treat them as literal names,
	// silently over-granting client-side if compiled.
	it('throws when a resource is "all"', () => {
		expect(() => compileStatements({ all: ["read"] })).toThrow(
			/resource "all" is a CASL wildcard subject/,
		);
	});

	it('throws when an action is "manage"', () => {
		expect(() => compileStatements({ project: ["manage"] })).toThrow(
			/action "manage" is a CASL wildcard action/,
		);
	});

	it("does not throw for a statements record using neither forbidden name", () => {
		expect(() =>
			compileStatements({ project: ["create", "delete"] }),
		).not.toThrow();
	});
});

describe("defineAbility (WS6.1)", () => {
	it("honors ownership conditions on tagged rows", () => {
		const ability = buildOwnershipAbility();

		expect(ability.can("update", subject("Expense", { paidById: "u1" }))).toBe(
			true,
		);
		expect(ability.can("update", subject("Expense", { paidById: "u2" }))).toBe(
			false,
		);
	});

	it("denies by default for undeclared actions and subjects", () => {
		const ability = buildOwnershipAbility();

		expect(ability.can("delete", subject("Expense", { paidById: "u1" }))).toBe(
			false,
		);
		expect(ability.can("read", "Expense")).toBe(false);
	});

	it("cannot() overrides a matching can()", () => {
		const ability = buildOwnershipAbility();

		expect(ability.can("update", subject("Report", { authorId: "u1" }))).toBe(
			true,
		);
		expect(
			ability.can("update", subject("Report", { authorId: "locked" })),
		).toBe(false);
	});

	it("abstract subjects answer plain string checks", () => {
		const ability = buildOwnershipAbility();

		expect(ability.can("read", "Billing")).toBe(true);
		expect(ability.can("update", "Billing")).toBe(false);
	});
});

describe("assertCan", () => {
	it("returns when the ability allows", () => {
		const ability = buildOwnershipAbility();
		expect(() =>
			assertCan(ability, "update", subject("Expense", { paidById: "u1" })),
		).not.toThrow();
	});

	it("throws FORBIDDEN when denied", () => {
		const ability = buildOwnershipAbility();
		let caught: unknown;
		try {
			assertCan(ability, "update", subject("Expense", { paidById: "u2" }));
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(ORPCError);
		expect((caught as ORPCError<string, unknown>).code).toBe("FORBIDDEN");
		expect((caught as ORPCError<string, unknown>).message).toBe(
			"Insufficient permissions",
		);
	});

	it("throws NOT_FOUND when cloaked", () => {
		const ability = buildOwnershipAbility();
		let caught: unknown;
		try {
			assertCan(ability, "update", subject("Expense", { paidById: "u2" }), {
				cloak: true,
			});
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(ORPCError);
		expect((caught as ORPCError<string, unknown>).code).toBe("NOT_FOUND");
	});
});

describe("packAbility / unpackAbility round-trip", () => {
	it("survives JSON serialization and answers identically, conditions included", () => {
		const original = buildOwnershipAbility();

		const packed = packAbility(original);
		const overWire = JSON.parse(JSON.stringify(packed)) as typeof packed;
		const restored =
			unpackAbility<ReturnType<typeof buildOwnershipAbility>>(overWire);

		const checks: [string, Parameters<typeof original.can>[1]][] = [
			["update", subject("Expense", { paidById: "u1" })],
			["update", subject("Expense", { paidById: "u2" })],
			["update", subject("Report", { authorId: "u1" })],
			["update", subject("Report", { authorId: "locked" })],
			["read", "Report"],
			["read", "Billing"],
			["update", "Billing"],
			["delete", subject("Expense", { paidById: "u1" })],
		];
		for (const [action, subj] of checks) {
			expect(restored.can(action, subj)).toBe(original.can(action, subj));
		}
	});
});
