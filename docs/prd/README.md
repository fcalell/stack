# PRDs

Forward-looking implementation drivers: *what we're about to build and in what order*. Distinct
from `.knowledge/` (the durable present-tense *what/why* reference): a PRD is a working plan that,
once shipped, is **folded into `.knowledge/` and retired**. Update the matching `architecture/`
entries (per `.claude/playbooks/knowledge-base.md`), then delete the file.

The layer above these drivers is [`../roadmap.md`](../roadmap.md): the sailward → stack extraction
model, the cross-cutting decisions, the coverage map, and this PRD pipeline. Read it for *why* a PRD
exists and *what's next*; read a PRD for *how* to build one workstream.

A PRD leads with scope (in / out), names the plugin + slot + runtime surfaces it touches, and ends
with ordered, independently-verifiable milestones and acceptance criteria.

## Active

- [deploy-engine](./deploy-engine.md): reconcile, deploy lock, blocking gates, ordered run, and a
  reusable terminal UI for `stack deploy`, extracted from sailward's `tools/release`. Product-agnostic
  CLI machinery; `plugin-native-updates` consumes its surfaces.
- [plugin-native-updates](./plugin-native-updates.md): over-the-air JS updates for the native app
  (self-hosted Hot Updater on Cloudflare): the update backend, the mobile client wiring, the publish
  step, a fingerprint-parity gate, and bundle-lifecycle subcommands.

Add the next PRD here as a self-contained block (scope in/out → surfaces touched → ordered
milestones), then retire it the same way once shipped. Point-in-time audits live in
[`../analysis/`](../analysis/), e.g. the over-engineering audit; treat those as snapshots, not
living docs.
