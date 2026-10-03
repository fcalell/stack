# Record abilities

A role says what a member may do anywhere in the organization. An ability says what a caller may
do to one record, from the record's own data: an owner column, a per-record seat. Build it in the
handler from `@fcalell/plugin-auth/ability`, which re-exports everything it needs.

```ts
// src/worker/lib/ability.ts
import { defineAbility } from "@fcalell/plugin-auth/ability";

type Subjects = {
  Expense: { paidById: string }; // checked per row: conditions read these fields
  Billing: never; // checked by name only: conditions are a type error
};

export function expenseAbility(userId: string, isOrganizer: boolean) {
  const { can, build } = defineAbility<Subjects, "read" | "update" | "delete">();
  can("read", "Expense");
  can("update", "Expense", { paidById: userId });
  if (isOrganizer) can("delete", "Expense");
  return build();
}
```

In the procedure, gate with `assertCan`, tagging the row with `subject`:

```ts
import { assertCan, packAbility, subject } from "@fcalell/plugin-auth/ability";

const ability = expenseAbility(context.user.id, seat.role === "organizer");
assertCan(ability, "update", subject("Expense", expense));
return { expense, rules: packAbility(ability) };
```

`assertCan` returns when allowed and throws `FORBIDDEN` when denied. `{ cloak: true }` throws
`NOT_FOUND` instead, at a site that must not reveal the record exists; `{ message }` replaces the
denial copy.

## On the client

Return `packAbility(ability)` on the query's output, typed `PackedRules`, and pass it to
`useAbility(organizationId, data?.rules)`, which layers it over the caller's role (api's client
page, `node_modules/@fcalell/plugin-api/guide/client.md`). Outside an organization, `unpackAbility(rules)`
rebuilds it.

## Rules

- Build an ability in the handler, from rows the handler loaded: the rules depend on data only
  its queries know.
- Never install or import `@casl/ability`: the subpath re-exports what an app uses.
- Never call an action `"manage"` or a subject `"all"`: both are wildcards and grant everything.
- Gate organization-wide permissions with the procedure's `can`, and keep abilities for what
  differs per record.

**Check:** `pnpm check` passes, and a test calling the procedure as a caller the rule refuses
answers `FORBIDDEN` (see [testing](./testing.md)).
