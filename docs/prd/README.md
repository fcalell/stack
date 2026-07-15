# PRDs

Forward-looking implementation drivers: *what we're about to build and in what order*. Distinct
from `.knowledge/` (the durable present-tense *what/why* reference): a PRD is a working plan that,
once shipped, is **folded into `.knowledge/` and retired**. Update the matching `architecture/`
entries (per `.claude/playbooks/knowledge-base.md`), then delete the file.

A PRD leads with scope (in / out), names the plugin + slot + runtime surfaces it touches, and ends
with ordered, independently-verifiable milestones and acceptance criteria.

## Active

- [backend-hardening](./backend-hardening.md): runtime hardening for `plugin-api` / `plugin-auth`
  (CSRF guard, error logging, OTP throttling, org tables), then entity-based cache invalidation, a
  client version gate, and DB safety gates. Phased P0 → P2; P0 items ship one PR each.

Add the next PRD here as a self-contained block (scope in/out → surfaces touched → ordered
milestones), then retire it the same way once shipped. Point-in-time audits live in
[`../analysis/`](../analysis/), e.g. the over-engineering audit; treat those as snapshots, not
living docs.
