# Abilities on the client

`ability(organizationId, record?)` is what the caller may do in that organization as a selection
of a `MongoAbility`: the rules of its role there, fetched once and cached per organization, read
like any read ([reads](./reads.md)). `useAbility(organizationId, recordRules?)` is the same as a
hook.

```tsx
const ability = useAbility(organizationId);
return ability.can("delete", "organization") ? <DeleteOrganization /> : null;
```

Gate an act that stands in a frame's head as a selection, so it paints inert while the rules load
and is never blocked by a wait:

```tsx
const rules = ability(organizationId);
<Section
  title="Danger"
  act={rules.at((a) => (a.can("delete", "organization") ? remove : { ...remove, blocked: "Only an owner can delete this." }))}
/>
```

An act on each row combines the rules into the items, so the list waits for them:
`combine([items, rules], (rows, a) => rows.map((row) => ({ ...row, act: a.can("update", subject("Expense", row)) ? edit(row) : undefined })))`.
The rules read is ambient: no frame holds it, and one that fails leaves its acts painted and inert,
never a false yes.

The ability denies everything while the id is `undefined` (no request is made), when the caller is
no member, and, in the hook, while the rules load, so it never answers a false yes.

## A record's own rules

To layer a record's own rules, return `packAbility(ability)` from the procedure
(`@fcalell/plugin-auth/ability`) and pass the packed field through: `useAbility(organizationId,
expense?.rules)`, or `ability(organizationId, expense.at((e) => e.rules))`, then
`ability.can("update", subject("Expense", expense))`. A mutation that declares `writes` on an
organization subject (`writes: ["member"]` on a role change) invalidates every organization's
rules. Never read the ability instance out of the query cache: it is composed (memoized) outside
it, and a copy from the cache is a new instance every render.

**Check:** `pnpm check` passes, and under `pnpm dev` a member without the grant sees the act inert.
