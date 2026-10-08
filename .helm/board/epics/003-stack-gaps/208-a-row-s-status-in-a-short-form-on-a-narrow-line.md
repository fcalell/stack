---
id: 003-208
status: backlog
sessions: {}
---
# react-ui: a row's status words take a short form when the meta line is out of room

## Goal
Stead's Repos list rows read title, then a meta line of the remote, "· main" and the status "Fetched 3 minutes ago" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/repos.tsx`, the `List` row at lines 94-95: `meta: [r.remote, r.defaultBranch]`, `status: fetchStatus(...)`; design/07-interface.md "Repos"). The status words are 122 px; they stand in 66 px at 1440 in the three-pane layout, 53 px at 390 and 35 px at 320, so a row reads "/tmp/fx9/remotes/sailw… · Fetched 1…", "Fetched 5 mi…", with "· main" gone and the remote cut as well. What is left of the status, "Fetched 1…", no longer says when. Evidence: Stead Repos critique unit u9 (stack `74a0e3d`, HEAD checked: `git log 74a0e3d..HEAD` holds no change to list-row or status), shots `list-390-light.png` and `repo-1440-light.png` in the Stead scratchpad `critique/u9/shots/`.

## Approach
Not a repeat of 003-118: that story asked the status to yield before the subject is cut, and was ruled closed because the status shares the overflow with the first part (003-104) and an app that needs a subject whole puts it first or moves the status's words. Here the app already gives the subject as the first part and the status in its own mark, and the shared overflow does what 003-104 built: both are cut, the status to a fragment. The part left unprovided is a status that can say less instead of being clipped. `Status` takes one `label` and truncates it (list-row/index.tsx `STATUS_MARK`, status/index.tsx); the app can pass a shorter word ("5 min ago") only for every width, since it does not know the line's room. 003-83 (and 047e0d1f) gave the trailing age a short form the row words itself, and the meta line's status of an age ("Fetched 5 minutes ago") has none. Moving the words elsewhere is not available either: they are the row's status, drawn with its dot.

## Acceptance criteria
- [ ] A row whose status words can be said shorter draws the short words when the meta line is out of room for the long ones, so a status is never left as a clipped fragment of its first word, on both platforms.
- [ ] A row with room, and a status with no short form, are unchanged.
- [ ] The ListRow showcase holds a status with a short form on a line too narrow for it, at 320, 390 and the 440 px list column, measured by the critique.

## Open questions
- [ ] Its shape (a `short` label on the status mark, a moment the row words itself as the trailing age does, or a floor in characters under which the status yields to the first part): the stack session decides.
