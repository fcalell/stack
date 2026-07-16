// Record-scoped authorization (WS6.1 + the
// WS6.2 compile). A thin, typed wrapper over CASL's `MongoAbility` — CASL is
// wrapped, never exposed: consumers must not install or import
// `@casl/ability` directly, the same rule as drizzle/hono/zod. Isomorphic:
// no `node:*` imports, no imports from this plugin's `node/` or `worker/`
// code, safe to import from worker handlers and client bundles alike.
import type {
	AnyMongoAbility,
	ForcedSubject,
	MongoAbility,
	MongoQuery,
	RawRuleOf,
} from "@casl/ability";
import {
	AbilityBuilder,
	subject as caslSubject,
	createMongoAbility,
} from "@casl/ability";
import { type PackRule, packRules, unpackRules } from "@casl/ability/extra";
import { ORPCError } from "@orpc/server";

// ---------- Subject vocabulary ----------

// Instance-checked subjects declare the row fields their conditions may
// read (e.g. `{ Expense: { paidById: string } }`). An abstract (string-only)
// subject maps to `never` — the bottom type is assignable to any field
// record, so `never` satisfies this constraint while making conditions on
// that subject impossible to type (see `ConditionsTail` below).
export type AbilitySubjects = Record<string, Record<string, unknown>>;

// The subject union CASL's ability actually checks against: an abstract
// subject stays a bare string; an instance subject is either the bare
// string (unconditional grants, e.g. `can("read", "Report")`) or a row
// tagged via `subject(name, row)` (see `ForcedSubject`).
type SubjectUnion<Subjects extends AbilitySubjects> = {
	[K in keyof Subjects & string]: [Subjects[K]] extends [never]
		? K
		: K | (Subjects[K] & ForcedSubject<K>);
}[keyof Subjects & string];

export type AbilityFor<
	Subjects extends AbilitySubjects,
	Actions extends string = string,
> = MongoAbility<[Actions, SubjectUnion<Subjects>]>;

// Optional 3rd argument to `can`/`cannot`: a `MongoQuery` over the subject's
// declared fields for an instance subject, or an empty tuple (no argument
// accepted) for an abstract one — passing conditions there is a type error.
type ConditionsTail<Fields> = [Fields] extends [never]
	? []
	: [conditions?: MongoQuery<Fields>];

type CanFn<Subjects extends AbilitySubjects, Actions extends string> = <
	K extends keyof Subjects & string,
>(
	action: Actions,
	subjectType: K,
	...conditions: ConditionsTail<Subjects[K]>
) => void;

// ---------- defineAbility ----------

export function defineAbility<
	Subjects extends AbilitySubjects,
	Actions extends string = string,
>(): {
	can: CanFn<Subjects, Actions>;
	cannot: CanFn<Subjects, Actions>;
	build: () => AbilityFor<Subjects, Actions>;
} {
	const builder = new AbilityBuilder<AbilityFor<Subjects, Actions>>(
		createMongoAbility,
	);
	return {
		// The builder's real `can`/`cannot` already do the right thing at
		// runtime (push `{ action, subject, conditions }`); only the static
		// type narrows here, to the simpler action+subject+conditions shape
		// this module commits to (no per-field rules).
		can: builder.can as unknown as CanFn<Subjects, Actions>,
		cannot: builder.cannot as unknown as CanFn<Subjects, Actions>,
		build: () => builder.build(),
	};
}

// Row tagging for instance checks: `subject("Expense", row)` marks `row` as
// an `Expense` so `ability.can("update", subject("Expense", row))` matches
// the rules declared for that subject type.
export function subject<
	Fields extends Record<string, unknown>,
	TSubjectType extends string,
>(
	subjectType: TSubjectType,
	row: Fields,
): Fields & ForcedSubject<TSubjectType> {
	return caslSubject(subjectType, row);
}

// ---------- assertCan ----------

export function assertCan<TAbility extends AnyMongoAbility>(
	ability: TAbility,
	action: Parameters<TAbility["can"]>[0],
	subjectArg: Parameters<TAbility["can"]>[1],
	opts?: { cloak?: boolean },
): void {
	if (ability.can(action, subjectArg)) return;
	if (opts?.cloak) {
		throw new ORPCError("NOT_FOUND");
	}
	throw new ORPCError("FORBIDDEN", { message: "Insufficient permissions" });
}

// ---------- pack / unpack ----------

// Wire format is exactly CASL's `packRules` output (arrays), no wrapping —
// exported type-only so client bundles can type a query's output without
// pulling any server code.
export type PackedRules<TAbility extends AnyMongoAbility = AnyMongoAbility> =
	PackRule<TAbility["rules"][number]>[];

export function packAbility<TAbility extends AnyMongoAbility>(
	ability: TAbility,
): PackedRules<TAbility> {
	return packRules(ability.rules) as PackedRules<TAbility>;
}

export function unpackAbility<TAbility extends AnyMongoAbility>(
	packed: PackedRules<TAbility>,
): TAbility {
	// `TAbility["rules"][number]` and `RawRuleOf<TAbility>` are the same type
	// once TAbility resolves, but tsc can't reduce the indexed access while
	// the generic is open; one cast bridges it.
	return createMongoAbility<TAbility>(
		unpackRules(packed) as RawRuleOf<TAbility>[],
	);
}

// ---------- compileStatements (WS6.2) ----------

// One-way compile: better-auth's statements model (`resource -> actions`,
// no conditions) is a strict subset of CASL's rule model, so every grant
// becomes an unconditional CASL rule. Statements stay the source of truth
// (better-auth's organization endpoints consult them internally); this never
// runs the other direction. Pure, uncached — the compile is trivial.
//
// CASL reserves the action `"manage"` and the subject `"all"` as wildcards
// (`can("manage", "all")` grants everything); better-auth's statements model
// has no such concept and treats both as literal names. Compiling a
// statements record that uses either would silently produce a CASL rule that
// over-grants every action/subject client-side — refuse instead of
// generating a broken ability.
const FORBIDDEN_ACTION = "manage";
const FORBIDDEN_SUBJECT = "all";

export function compileStatements(
	grants: Record<string, readonly string[]>,
): { action: string; subject: string }[] {
	const rules: { action: string; subject: string }[] = [];
	for (const [resource, actions] of Object.entries(grants)) {
		if (resource === FORBIDDEN_SUBJECT) {
			throw new Error(
				`compileStatements: resource "${FORBIDDEN_SUBJECT}" is a CASL wildcard subject (matches every subject), but better-auth statements treat it as a literal resource name. Compiling it would over-grant client-side — use a specific resource name instead.`,
			);
		}
		for (const action of actions) {
			if (action === FORBIDDEN_ACTION) {
				throw new Error(
					`compileStatements: action "${FORBIDDEN_ACTION}" is a CASL wildcard action (matches every action), but better-auth statements treat it as a literal action name. Compiling it would over-grant client-side — use a specific action name instead.`,
				);
			}
			rules.push({ action, subject: resource });
		}
	}
	return rules;
}
