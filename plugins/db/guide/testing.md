# Testing with the database

A procedure test boots the generated test entry, as api's testing page
(`node_modules/@fcalell/plugin-api/guide/testing.md`) describes. On the d1 dialect the entry
also boots a database: each `boot()` gets its own local D1, built from the committed migrations,
and the handle carries `db`, the same Drizzle client the procedures get.

```ts
// src/worker/routes/projects.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { testing } from "../../../.stack/testing.ts";
import { projects } from "../../schema/index.ts";

test("lists a project", async () => {
  await using app = await testing.boot();
  await app.db.insert(projects).values({ id: "p1", organizationId: "org_1", name: "Demo", createdAt: new Date() });
  // call app.client() as a member of org_1 and assert on the row
});
```

## What a boot's database is

- In memory and private to that boot: nothing touches the dev database, and two boots, or two
  test files running in parallel, never share rows. Each test inserts the rows it needs.
- Built from the `.sql` files in `src/migrations/`, applied in filename order the way deploy
  applies them, never from a push of the schema. A schema change a test needs is generated with
  `stack db generate` first; an empty migrations directory fails the boot by name, and a failing
  migration fails it with the file's name.
- Never seeded: `seed.ts` does not run.
- Disposed with the boot (`await using`, or `app.dispose()`).
- Reached over loopback connections that each D1 call reuses, when the consumer links stack
  (`link:../stack/...`): stack's install patches miniflare for it. A consumer installing stack
  from GitHub installs its own unpatched wrangler, which opens and closes one connection per D1
  call; a long worker suite then fails on macOS with `connect EADDRNOTAVAIL` once the loopback
  ports run out. Its remedy is the same miniflare patch in its own install, until a wrangler
  release carries upstream's fix.

## On sqlite

The sqlite dialect adds no database to the boot and no `db` to the handle. The worker opens the
dev database file, the one `stack dev` uses, resolved against the directory the tests run from;
its rows persist across boots and test files. Run `stack db push` first so the file holds the
schema, and make each test create the rows it reads under keys of its own.

**Check:** `node --test` passes on the test file.
