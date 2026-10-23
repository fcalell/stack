# Abilities on the client

`ability(organizationId, record?)` is what the caller may do in that organization as a selection
of a `MongoAbility`: the rules of its role there, fetched once and cached per organization, read
like any read ([reads](./reads.md)). `useAbility(organizationId, recordRules?)` is the same as a
hook.

```tsx
const ability = useAbility(organizationId);
return ability.can("delete", "organization") ? <DeleteOrganization /> : null;
```

Gate an act that stands in a frame's head as a selection. It paints its box while the rules load,
stands still with no sentence when they are not asked for, and is blocked with the failed sentence
once that read has failed or is missing, never a false yes:

```tsx
const rules = ability(organizationId);
<Section
  title="Danger"
  act={rules.at((a) => (a.can("delete", "organization") ? remove : { ...remove, blocked: "Only an owner can delete this." }))}
/>
```

An act on each row is a selection of the rules too, so the list never waits on them:
`act: (row) => rules.at((a) => (a.can("update", subject("Expense", row)) ? edit(row) : undefined))`, and
`more` the same. The row's act paints its box while the rules load, and stands blocked with the failed
sentence once that read failed or went missing, never a false yes. The rules read is ambient: no frame
holds it.

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

**Check:** `pnpm check` passes, and under `pnpm dev` a member without the grant sees the act blocked with your reason.
