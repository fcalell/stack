# File a gap in stack

A gap is a part the app needs that stack does not provide: a component, variant, token or state
in the UI, an option in a plugin, a feature of a procedure, a column type in the database. It is
never worked around in the app (no host element with tokens, no local copy of a stack module,
no wrapper that re-adds what stack lacks). The part waits while the rest of the work goes on.
Work the steps in order; each ends with its check.

## 1. Find the pin and the checkout

Every `@fcalell/*` spec in the app's `package.json` is `github:<repo>#path:/…`, with no commit;
the pin is the commit `pnpm-lock.yaml` records for them, one sha for every stack package. The
stack checkout is `../stack` beside the app's root when it is a clone of `<repo>`; otherwise ask
fcalell for its path.

**Check:** you have the sha and a checkout whose `git remote -v` names `<repo>`.

## 2. Look at stack's latest

Fetch the checkout when it has a remote, then read the part at `HEAD`:

```bash
git -C <checkout> fetch
git -C <checkout> show HEAD:packages/ui-core/src/roster.ts   # a UI part
git -C <checkout> log --oneline <sha>..HEAD -- plugins/api    # what moved in a domain
```

When `HEAD` has the part, the fix is moving the pin: `pnpm update "@fcalell/*"`, which moves
every stack package in `pnpm-lock.yaml` to the latest commit together. Propose that move to
fcalell and stop here; the work resumes once it lands.

**Check:** the part is absent at `HEAD`, or the pin move is proposed.

## 3. Find the epic

Every gap is a story under one standing epic on stack's helm board, the directory
`.helm/board/epics/<NNN>-stack-gaps/` in the checkout. When none exists, create it with an
`epic.md`:

```markdown
---
sessions: {}
---
# Stack gaps

## Goal
Parts stack consumers need that stack does not provide, each filed by the consumer that hit it.

## Breakdown rationale
One story per gap, its title prefixed with its domain.
```

Ordinals are never reused. The next epic number is one past the highest among the live
`epics/` directories and every epic path git ever added
(`git -C <checkout> log --diff-filter=A --name-only --format= -- .helm/board/epics`); a story's
number follows the same rule inside its epic. Epics take three digits, stories two.

**Check:** `ls <checkout>/.helm/board/epics` shows exactly one `-stack-gaps` directory.

## 4. Write the story

Add `<NN>-<slug>.md` to the epic. Its title opens with the domain, the package the part belongs
to without its scope (`ui-core: …`, `api: …`, `db: …`). The frontmatter has exactly these three
keys; add none.

```markdown
---
id: <NNN>-<NN>
status: backlog
sessions: {}
---
# ui-core: a dense two-column table row

## Goal
What is missing, and the app work that needs it (repo, route or file, spec).

## Approach
Why nothing stack ships provides it: each thing tried and where it falls short.
The reference that shows the part, when there is one.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
```

Write the file; never commit in the stack checkout.

**Check:** the story's frontmatter has exactly `id`, `status` and `sessions`, and its `id`
matches its directory and file numbers.

## 5. Report and wait

Report the story's id to fcalell with the write-up. Work that needs the part is neither judged
nor presented while the gap is open. When the story ships, step 2 moves the pin and the work
resumes.

**Check:** fcalell has the story id.
