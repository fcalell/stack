---
id: 004-06
status: review
sessions: {}
---
# react-ui, native-ui: a Thread's messages from data draw their own four states

## Goal
A `Thread` repeats one item shape, a message, over a conversation, but takes its `Message`s as
children (`turns.map(…)` in `showcase/layout/assistant.tsx`). A loading conversation has no
form: the app would have to stand `Message loading` twins itself, and a failed or empty one has
none at all.

## Approach
Thread takes `query` (with `sentence`) or `items`, plus a `message` map over `Message`'s slots:
`author` (`you`, `other`, `system`), `name`, `body`, `at`, `onOpen`, each `(item) => …`. `foot`
(the `MessageInput`) stays a node: it is the one authored part, and it draws in every state.

- **Pending**: `Message`'s own loading forms in a fixed order (another's reply, yours, another's
  reply), since `author` is per item and unknown before the data; the log at its end.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry in the log's column.
- **Empty**: `empty`, an `EmptyState` in the log (a first run: what to ask).
- **Loaded**: the messages oldest first, following the newest while the reader is at the end, as
  today.

Each item's key follows 004-02's answer. Web and phone take the same props; on the phone the log stays the `ScrollView` that follows the
end and is a polite live region. Needs a query (a conversation's history) and `items` (turns
held locally while an answer streams, as the showcase's are).

## Acceptance criteria
- [x] (test) both plugins' `Thread` take `query`/`items` + `message` + `sentence` + `empty`, children are gone from the roster entry, and it lists the `loading`, `error` and `empty` states.
- [ ] (live) the assistant page passes its turns as data and draws the pending, failed and empty forms under `&query=loading|error`.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. Open for the critique: the failed and empty forms take the page EmptyState form and stand at the log's top; the showcase cannot reach the empty form (`useFixture` has no empty mode). Open: the live check (web per batch, phone on the harness).
The web live criteria pass and the web design critique's findings are fixed, measured at 1440 and 375.
