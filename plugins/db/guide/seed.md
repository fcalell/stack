# Seed data

`src/schema/seed.ts` holds the rows every database starts with: reference data, a demo
organization, a dev user. Rows are typed against each table's insert model, with no SQL and no
column-name mapping.

```ts
// src/schema/seed.ts
import { defineSeed, seedTable } from "@fcalell/plugin-db/orm";
import { projects } from "./index.ts";

export default defineSeed([
  seedTable(projects, [
    { id: "demo", organizationId: "org_demo", name: "Demo project", createdAt: new Date() },
  ]),
]);
```

## When it runs

- `stack dev`, after the schema push at start, and again on every save of `seed.ts`.
- `stack db seed`, against the local database; `stack db seed --remote`, against the deployed D1.
- `stack deploy` on d1, after the migrations.

Each run converges the database on the file: rows upsert by primary key, then rows whose key
left the seed are deleted. A table with no primary key is emptied and refilled, and a table
seeded with `[]` is emptied. So a seeded table belongs to the seed; never seed a table the app's
users write to.

## Rules

- Keep the file erasable TypeScript: `stack` loads it with a plain `import()` under Node's type
  stripping, so no enums, no parameter properties, no `namespace`, and every relative import
  names its file's extension (`./index.ts`, never `./index`).
- `export default defineSeed([...])`; any other default export is refused.
- Every row carries its primary key; a row without it is refused. Omit any other column to let
  its SQL default apply.
- A row a user's data points at keeps that link only while its key stays in the seed; give the
  foreign key `onDelete: "set null"` when the row may leave it.

**Check:** `stack db seed` prints `Seeded`.
