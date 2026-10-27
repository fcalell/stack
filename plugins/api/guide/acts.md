# Acts and saves

An act's `onAct` returns the promise of the work it starts, and the host that draws the act holds
the run (pending, failure); the app passes no `loading`:

```tsx
const create = useMutation(orpc.projects.create.mutationOptions());
const add = {
  label: "Add",
  onAct: () => create.mutateAsync({ name }),
};
```

- Return `mutateAsync`'s promise, never `mutate()`, and `.catch` nothing: the host draws the
  rejection, in its line or a failed toast with Retry, and the toast's Retry runs `onAct` again.
- The sentence is `refusal(error)` from `@fcalell/plugin-api/acts`, else the
  generic one; an act has no sentence of its own. `refusal` is an `ORPCError`'s own message, capitalised and stopped, for a 4xx
  other than 401, 403, 404 and 429 whose message is not the code's stock text
  (`new ApiError("BAD_REQUEST", { message: "That name is taken" })` reads "That name is taken.");
  anything else is `undefined`.
- An input the procedure's zod schema refused keeps the schema's sentences. `refusal` is the first
  issue's message (`z.string().min(1, "Enter a name")` reads "Enter a name."), and
  `issues(error)` from the same module (also exported by `@fcalell/plugin-api/tanstack-query`) is
  every issue as `{ path, message }` in the schema's order (`path` is `["address", "city"]` for a
  nested field, empty for the input as a whole), none for any other error, so a form says each
  on its field: `error={issues(error).find((i) => i.path[0] === "name")?.message}`.
- A machine name in a refusal stands between backticks in the message
  (``"No package at `packages/lead-mail`"``), the one marker a sentence carries; a field's `error`
  takes runs, and `markedRuns(message)` from `@fcalell/ui-core/form` turns the backticked span
  into a `{ code }` run (a `Form` does it for the issues it draws).
- Nothing queues for a connection that is not there. `createQueryClient`'s mutation cache runs
  `guardReach` before every mutation: while `onlineManager` is offline, or a cached read's
  `meta.reach` says the server is out of reach (`ws.connection` from
  `@fcalell/plugin-node/client`), the mutation rejects with `Unreached` before any fetch, so
  it never pauses and never fires on reconnect. The host draws the generic sentence with no Retry; the
  connection's reason is the app's offline banner's. A `mutationCache` you supply yourself must call `guardReach(client)` in its
  `onMutate`.
- An act given as a selection (`rules.at((a) => …)`) is the viewer's to press only when its read
  answered: it paints while the read waits and stands blocked once the read has failed or is
  missing, with the failed sentence (`words.missing` when missing). A constant act is live in every
  frame form.
- Invalidation is not awaited, so what the act changed shows through the reads it refetches (their
  busy mark); there is no done mark.

In dev, `QueryProvider` checks the two ways an act goes unseen with `console.error`: a mutation an
`onAct` started that returned no promise (the act would read as done at once), and a mutation that
failed with nothing drawing it within a tick. A mutation with an `onError` of its own is exempt, so
a handler that catches a failure itself (`.catch(setError)` on the call, or the option) draws it
and the check stays quiet.

A host or control of your own holds a run with `useRun<K>()`: `run(key, onAct)` calls `onAct`, and
`pending` (the key) and `failure` (`{ key, error }`, kept until the next run) follow its
promise, the newest run counting alone.

## A value that saves as it changes

`useDraft(datum, failed?)` ([reads](./reads.md)) saves through `change(next, save)`, a `save` that
returns a promise:

```tsx
const draft = useDraft(notify, (error, again) =>
  toast(refusal(error) ?? "Not saved.", { tone: "failed", act: { label: "Retry", onAct: again } }),
);
<input type="checkbox" checked={draft.value} disabled={draft.painted}
  onChange={(e) => draft.change(e.target.checked, () => save.mutateAsync({ notify: e.target.checked }))} />
```

While a save pends the draft holds `next`, a selection's or a constant's. Each change supersedes the
one before and only the latest's outcome counts: resolved, the hold waits for the refetch that the
write's invalidation started on the draft's reads, then follows its datum unless it was edited
since; rejected, it falls back to the datum and `failed` hears the error with `again`, a way to save
the same value. `change` returns the save's promise (never rejecting, since `failed` draws the
rejection), so an act that saves again holds the run. react-ui and native-ui's controls do all of
this: hand one the promise from `onChange`, or from `onCommit` for an `Input` or
`Slider`. A form field hosts its control's save: the field holds the draft and a refusal draws in
the field's own line. A control standing alone holds its own draft and a rejection is a toast with
Retry. Two saves in flight can reach the server out of order; a mutation that cares gives
itself a `scope`.

**Check:** `pnpm check` passes, and under `pnpm dev` a refused act shows its sentence and Retry.
