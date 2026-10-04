---
id: 002-09
status: backlog
sessions: {}
---
# cli, plugin-api: an app with an API has a server target

## Goal
`stack init --plugins=native-ui` pulls in api, auth and db but no `cloudflare` or `node`, so the
worker has no generated types and `tsc -b` fails (`Cannot find name 'console'` in
`src/worker/plugins/auth.ts`). Blocks 002-06.

## Approach
Approved by fcalell (2026-10-04): api requires one server target; init asks which, with
cloudflare as the non-interactive default. The plugin contract's `requires` gains a "one of".

## Acceptance criteria
- [ ] (test) the requires closure of native-ui includes exactly one server target, cloudflare by default.
- [ ] (live) a scaffolded phone app type-checks.
