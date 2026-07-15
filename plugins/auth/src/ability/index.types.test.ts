import { describe, expectTypeOf, it } from "vitest";
import type { AbilityFor, PackedRules } from "./index";
import { defineAbility, packAbility, subject, unpackAbility } from "./index";

// Instance-checked subjects declare the row fields their conditions may
// read; an abstract subject maps to `never`, which makes any conditions
// argument a type error (WS6.1's tuple pattern).
type Subjects = {
	Expense: { paidById: string };
	Report: { authorId: string; draft: boolean };
	Billing: never;
};

type Actions = "create" | "read" | "update" | "delete";

describe("defineAbility types", () => {
	it("conditions on an instance subject type-check against declared fields", () => {
		const { can, cannot } = defineAbility<Subjects, Actions>();

		can("update", "Expense", { paidById: "u1" });
		can("update", "Report", { authorId: "u1", draft: false });
		cannot("delete", "Report", { draft: true });

		// @ts-expect-error: "ownerId" is not a declared field of Expense
		can("update", "Expense", { ownerId: "u1" });

		// @ts-expect-error: draft is boolean, not string
		can("update", "Report", { draft: "yes" });
	});

	it("conditions on an abstract subject are a type error", () => {
		const { can } = defineAbility<Subjects, Actions>();

		can("read", "Billing");

		// @ts-expect-error: Billing is abstract (string-only); no conditions argument exists
		can("read", "Billing", { plan: "pro" });
	});

	it("rejects actions and subjects outside the declared vocabulary", () => {
		const { can } = defineAbility<Subjects, Actions>();

		// @ts-expect-error: "publish" is not a declared action
		can("publish", "Report");

		// @ts-expect-error: "Invoice" is not a declared subject
		can("read", "Invoice");
	});

	it("subject() tags a row for instance checks against the built ability", () => {
		const { can, build } = defineAbility<Subjects, Actions>();
		can("update", "Expense", { paidById: "u1" });
		const ability = build();

		expectTypeOf(ability).toEqualTypeOf<AbilityFor<Subjects, Actions>>();
		expectTypeOf(
			ability.can("update", subject("Expense", { paidById: "u1" })),
		).toBeBoolean();
	});
});

describe("PackedRules types", () => {
	it("pack/unpack round-trips the ability's Subjects typing", () => {
		const { build } = defineAbility<Subjects, Actions>();
		const ability = build();

		const packed = packAbility(ability);
		expectTypeOf(packed).toEqualTypeOf<
			PackedRules<AbilityFor<Subjects, Actions>>
		>();

		const restored = unpackAbility<AbilityFor<Subjects, Actions>>(packed);
		expectTypeOf(restored).toEqualTypeOf<AbilityFor<Subjects, Actions>>();
	});
});
