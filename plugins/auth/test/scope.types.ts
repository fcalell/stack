import type { InferSelectModel } from "@fcalell/plugin-db/orm";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import { defineScope, organization, type ScopeContext } from "../src/scope.ts";
import type { Tenancy } from "../src/worker/tenancy.ts";

// `tsc` runs over this file in `pnpm check`: a resolver that loses its
// scope's context fails the check.
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

const project = sqliteTable("project", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
});

// A tenancy answers the context its scope names.
const scope = defineScope({
	name: "project",
	table: project,
	parent: [organization, project.organizationId],
});
// Never called: the types of what a tenancy would answer.
async function answers(tenancy: Tenancy) {
	return {
		resolved: await tenancy.resolve(scope, "id", "user"),
		bySlug: await tenancy.bySlug(scope, "slug", "parent", "user"),
	};
}
type Answers = Awaited<ReturnType<typeof answers>>;
type Context = ScopeContext<typeof scope>;
assertType<Equal<Answers["resolved"], Context | null>>(true);
assertType<Equal<Answers["bySlug"], Context | null>>(true);
assertType<Equal<Context["project"], InferSelectModel<typeof project>>>(true);
